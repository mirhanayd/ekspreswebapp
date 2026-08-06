<#
.SYNOPSIS
Synchronizes GitHub governance (labels, milestones, issues, and project) for the Siirt Kurtalan Ekspres Demo MVP.

.DESCRIPTION
This script reads the issues_manifest.json and .github/labels.yml, ensures the repository visibility is private,
creates missing labels, milestones, issues, and establishes the required GitHub Project.
#>

$Repo = "mirhanayd/ekspreswebapp"
$ProjectOwner = "mirhanayd"
$ProjectTitle = "Siirt Kurtalan Ekspres - Demo MVP"

# Alias gh if not in path but exists in Program Files
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    if (Test-Path "C:\Program Files\GitHub CLI\gh.exe") {
        Set-Alias gh "C:\Program Files\GitHub CLI\gh.exe"
    }
}

Write-Host "Verifying gh authentication..." -ForegroundColor Cyan
$AuthStatus = & gh auth status --hostname github.com 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub CLI is not authenticated."
    exit 1
}

Write-Host "Verifying repository visibility..." -ForegroundColor Cyan
$RepoInfo = & gh repo view $Repo --json isPrivate | ConvertFrom-Json
if (-not $RepoInfo.isPrivate) {
    Write-Error "Repository $Repo is not private. Halting operation."
    exit 1
}
Write-Host "Repository is private. Proceeding." -ForegroundColor Green

Write-Host "Creating Labels..." -ForegroundColor Cyan
$LabelsYml = Get-Content -Raw ".github\labels.yml"
$MatchNames = [regex]::Matches($LabelsYml, 'name:\s*"([^"]+)"')
$MatchColors = [regex]::Matches($LabelsYml, 'color:\s*"([^"]+)"')

for ($i=0; $i -lt $MatchNames.Count; $i++) {
    $Name = $MatchNames[$i].Groups[1].Value
    $Color = $MatchColors[$i].Groups[1].Value

    $Args = @("label", "create", $Name, "--repo", $Repo, "--color", $Color, "--force")
    & gh @Args 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Label: $Name ensured."
    }
}

Write-Host "Reading manifest..." -ForegroundColor Cyan
$ManifestPath = "docs\project\issues_manifest.json"
if (-not (Test-Path $ManifestPath)) {
    Write-Error "Manifest not found at $ManifestPath"
    exit 1
}

$Manifest = Get-Content -Raw $ManifestPath | ConvertFrom-Json

Write-Host "Creating Milestones..." -ForegroundColor Cyan
foreach ($Milestone in $Manifest.milestones) {
    $MilestonesJson = & gh api "/repos/$Repo/milestones"
    $MilestoneExists = $MilestonesJson | ConvertFrom-Json | Where-Object { $_.title -eq $Milestone }

    if (-not $MilestoneExists) {
        Write-Host "Creating milestone: $Milestone"
        $Args = @("api", "/repos/$Repo/milestones", "-f", "title=$Milestone")
        & gh @Args > $null
    } else {
        Write-Host "Milestone already exists: $Milestone"
    }
}

Write-Host "Setting up Project..." -ForegroundColor Cyan
$Projects = & gh project list --owner $ProjectOwner --format json | ConvertFrom-Json
$TargetProject = $Projects.projects | Where-Object { $_.title -eq $ProjectTitle }

if (-not $TargetProject) {
    Write-Host "Project not found. Creating..."
    $Args = @("project", "create", "--owner", $ProjectOwner, "--title", $ProjectTitle, "--format", "json")
    $TargetProjectInfo = & gh @Args | ConvertFrom-Json
    $ProjectNumber = $TargetProjectInfo.number

    $ArgsEdit = @("project", "edit", $ProjectNumber, "--owner", $ProjectOwner, "--visibility", "PRIVATE")
    & gh @ArgsEdit

    $ArgsLink = @("project", "link", $ProjectNumber, "--owner", $ProjectOwner, "--repo", "ekspreswebapp")
    & gh @ArgsLink

    Write-Host "Project created, set to PRIVATE, and linked. Number: $ProjectNumber" -ForegroundColor Green
} else {
    $ProjectNumber = $TargetProject.number
    Write-Host "Project already exists. Number: $ProjectNumber" -ForegroundColor Green
}

Write-Host "Fetching all existing issues for idempotency check..." -ForegroundColor Cyan
$AllIssuesArgs = @("issue", "list", "--repo", $Repo, "--state", "all", "--limit", "200", "--json", "number,title,url")
$AllIssuesJson = & gh @AllIssuesArgs | ConvertFrom-Json

Write-Host "Creating Issues..." -ForegroundColor Cyan
foreach ($Issue in $Manifest.issues) {
    $ExistingIssue = $AllIssuesJson | Where-Object { $_.title -eq $Issue.title }

    if (-not $ExistingIssue) {
        Write-Host "Creating issue: $($Issue.title)"
        $Args = @("issue", "create", "--repo", $Repo, "--title", $Issue.title, "--body", $Issue.body)
        if ($Issue.labels) { $LabelsArg = $Issue.labels -join ","; $Args += "--label"; $Args += $LabelsArg }
        if ($Issue.milestone) { $Args += "--milestone"; $Args += $Issue.milestone }

        $NewIssueUrl = & gh @Args
        Write-Host "Created: $NewIssueUrl"

        $ArgsAdd = @("project", "item-add", $ProjectNumber, "--owner", $ProjectOwner, "--url", $NewIssueUrl)
        & gh @ArgsAdd > $null
    } else {
        Write-Host "Issue already exists: $($Issue.title)"
        # Try to ensure it's in the project if it exists. Ignore if already added.
        $ArgsAdd = @("project", "item-add", $ProjectNumber, "--owner", $ProjectOwner, "--url", $ExistingIssue[0].url)
        & gh @ArgsAdd 2>$null >$null
    }
}

Write-Host "Synchronization complete." -ForegroundColor Green

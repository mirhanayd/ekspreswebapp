<#
.SYNOPSIS
Synchronizes GitHub governance (labels, milestones, issues, and project) for the Siirt Kurtalan Ekspres Demo MVP.

.DESCRIPTION
This script reads the issues_manifest.json and .github/labels.yml, ensures the repository visibility is private,
creates missing labels, milestones, issues, and establishes the required GitHub Project.

.NOTES
Requires GitHub CLI (gh) to be installed and authenticated.
Run `gh auth login --hostname github.com --git-protocol https --web --scopes "repo,project"` first.
#>

$Repo = "mirhanayd/ekspreswebapp"
$ProjectOwner = "mirhanayd"
$ProjectTitle = "Siirt Kurtalan Ekspres — Demo MVP"

Write-Host "Verifying gh authentication..." -ForegroundColor Cyan
$AuthStatus = gh auth status --hostname github.com 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "GitHub CLI is not authenticated. Please run: gh auth login --hostname github.com --git-protocol https --web --scopes 'repo,project'"
    exit 1
}

Write-Host "Verifying repository visibility..." -ForegroundColor Cyan
$RepoInfo = gh repo view $Repo --json isPrivate | ConvertFrom-Json
if (-not $RepoInfo.isPrivate) {
    Write-Error "Repository $Repo is not private. Halting operation."
    exit 1
}
Write-Host "Repository is private. Proceeding." -ForegroundColor Green

Write-Host "Creating Labels..." -ForegroundColor Cyan
# Parse .github/labels.yml and create them if they don't exist
# We'll use a simple regex approach since powershell doesn't have native YAML parsing without modules
$LabelsYml = Get-Content -Raw ".github\labels.yml"
$LabelNames = [regex]::Matches($LabelsYml, 'name:\s*"([^"]+)"').Groups[1].Value
$LabelColors = [regex]::Matches($LabelsYml, 'color:\s*"([^"]+)"').Groups[1].Value

for ($i=0; $i -lt $LabelNames.Count; $i++) {
    $Name = $LabelNames[$i]
    $Color = $LabelColors[$i]
    
    # Try to create label. If it exists, update it.
    gh label create "$Name" --repo $Repo --color "$Color" --force 2>$null
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
    # Check if milestone exists
    $Exists = gh api "/repos/$Repo/milestones" -q ".[] | select(.title==`"$Milestone`") | .title"
    if (-not $Exists) {
        Write-Host "Creating milestone: $Milestone"
        gh api "/repos/$Repo/milestones" -f title="$Milestone" > $null
    } else {
        Write-Host "Milestone already exists: $Milestone"
    }
}

Write-Host "Setting up Project..." -ForegroundColor Cyan
$Projects = gh project list --owner $ProjectOwner --format json | ConvertFrom-Json
$TargetProject = $Projects.projects | Where-Object { $_.title -eq $ProjectTitle }

if (-not $TargetProject) {
    Write-Host "Project not found. Creating..."
    $TargetProjectInfo = gh project create --owner $ProjectOwner --title $ProjectTitle --format json | ConvertFrom-Json
    $ProjectNumber = $TargetProjectInfo.number
    
    # Enforce private visibility and link
    gh project edit $ProjectNumber --owner $ProjectOwner --visibility PRIVATE
    gh project link $ProjectNumber --owner $ProjectOwner --repo "ekspreswebapp"
    Write-Host "Project created, set to PRIVATE, and linked. Number: $ProjectNumber" -ForegroundColor Green
} else {
    $ProjectNumber = $TargetProject.number
    Write-Host "Project already exists. Number: $ProjectNumber" -ForegroundColor Green
}

Write-Host "Creating Issues..." -ForegroundColor Cyan
foreach ($Issue in $Manifest.issues) {
    # Check if issue with same title exists
    $ExistingIssue = gh issue list --repo $Repo --search "in:title `"$($Issue.title)`"" --json number | ConvertFrom-Json
    
    if (-not $ExistingIssue) {
        Write-Host "Creating issue: $($Issue.title)"
        $LabelsArg = $Issue.labels -join ","
        $NewIssueUrl = gh issue create --repo $Repo --title $Issue.title --body $Issue.body --label $LabelsArg --milestone $Issue.milestone
        Write-Host "Created: $NewIssueUrl"
        
        # Add to project
        gh project item-add $ProjectNumber --owner $ProjectOwner --url $NewIssueUrl > $null
    } else {
        Write-Host "Issue already exists: $($Issue.title)"
    }
}

Write-Host "Synchronization complete." -ForegroundColor Green

# Delivery Workflow

This document outlines the standard delivery workflow for the Siirt Kurtalan Ekspres Demo MVP.

## Core Principles

- **One concern per issue:** An issue should describe a single feature, bug, or technical task.
- **One issue per branch:** Branches must map directly to an active issue.
- **One reviewable concern per PR:** Pull requests must be atomic and reviewable.

## Branching

Branches should be named using the following convention:

- `<type>/<issue-number>-<short-description>`

Types: `feature`, `bugfix`, `chore`, `docs`.
Example: `feature/12-seat-selection-ui`

## Pull Requests

- All PRs must link to their associated issue by using `Closes #<issue-number>` in the PR body.
- PRs must pass all required CI checks before merging.
- **No self-approval:** (Except when acting as a solo agent, where we rely on CI and DoD).
- **No merge before CI:** The pipeline must pass (build, lint, tests).
- Documentation and tests related to a feature must be included in the _same_ feature PR.

## Definition of Done (DoD)

Before merging, a PR must meet the following:

1. All acceptance criteria in the issue are met.
2. Automated tests for the feature are added/updated and passing.
3. CI pipeline passes.
4. Relevant documentation (OpenAPI, README, AGENTS.md) is updated.

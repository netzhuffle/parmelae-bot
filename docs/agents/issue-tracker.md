# Issue tracker: GitHub

Use the `gh` CLI for repository issues and pull requests. Read the body, comments, and labels when fetching a ticket; include the diff for a PR review.

## Pull requests as a triage surface

**PRs as a request surface: yes.**

External PRs use the same triage labels and states as issues:

- **List external PRs for triage**: `gh pr list --state open --json number,title,body,labels,author,authorAssociation,comments` then keep only `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE` (drop `OWNER`/`MEMBER`/`COLLABORATOR`).

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## Triage labels

| Role                          | Label             |
| ----------------------------- | ----------------- |
| Maintainer evaluation         | `needs-triage`    |
| Waiting on reporter           | `needs-info`      |
| Ready for an agent            | `ready-for-agent` |
| Requires human implementation | `ready-for-human` |
| Will not be actioned          | `wontfix`         |

## Wayfinding

Before creating a map, claiming a child ticket, or resolving dependencies, read [wayfinding operations](wayfinding.md).

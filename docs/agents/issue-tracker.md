# Issue tracker: GitHub

Issues and specs live in this repository’s GitHub Issues. Use the `gh` CLI for issues and pull requests.

## Pull requests as a triage surface

**PRs as a request surface: yes.**

External PRs have `authorAssociation` of `CONTRIBUTOR`, `FIRST_TIME_CONTRIBUTOR`, or `NONE`.

GitHub shares one number space across issues and PRs, so a bare `#42` may be either — resolve with `gh pr view 42` and fall back to `gh issue view 42`.

## Triage labels

See the [triage label mapping](triage-labels.md).

## Wayfinding operations

`/wayfinder` uses GitHub issues with native sub-issues and issue dependencies.

- **Children:** `gh api --method POST repos/<owner>/<repo>/issues/<map>/sub_issues -F sub_issue_id=<child-db-id>`. Where sub-issues are unavailable, use a task list in the map and `Part of #<map>` in each child.
- **Blocking:** `gh api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`. The ID is the numeric database ID (`gh api repos/<owner>/<repo>/issues/<n> --jq .id`), rather than the issue number or `node_id`. Where native dependencies are unavailable, use `Blocked by: #<n>, #<n>` in the child body.
- **Frontier query:** Scope open issues to the map’s sub-issues or task list; native `issue_dependencies_summary.blocked_by` counts open blockers. With body-based dependencies, resolve each blocker’s state.

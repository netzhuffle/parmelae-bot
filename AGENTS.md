# Repository guidance

## Completion

- Run `bun run checks` before handing off implementation changes; completion means the command exits successfully.

## Conditional guidance

- **Implementation and review:** Read `CODING_STANDARDS.md` before changing or reviewing code.
- **Tool composition:** Before changing LangChain tool construction, registration, or identity tools, read `docs/architecture/tool-composition.md`.
- **Tool-call history:** Before changing graph execution, tool announcements, message persistence, history reconstruction, or final-response linkage, read `docs/architecture/tool-call-lifecycle.md`.
- **Commits:** Before creating a commit, read `docs/agents/commits.md`.

## Agent skills

- **Issues and pull requests:** Before reading or writing GitHub issues or pull requests, read `docs/agents/issue-tracker.md`.
- **Triage:** Before applying triage roles, read `docs/agents/triage-labels.md`.
- **Domain docs:** Before relying on domain vocabulary or architectural decisions, read `docs/agents/domain.md`.

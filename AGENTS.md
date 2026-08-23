# Repository guidance

## Development

- Use Bun for runtime and package operations. Prefer TypeScript for new source files.
- Services own business logic; repositories own CRUD, queries, and mapping.
- LangChain tools use `ToolContext` / `getToolContext(config)` for dependencies and must be registered in `ChatGptAgentService`.
- Import Prisma model and enum types directly from their generated files rather than barrel files.
- Prefer fakes at external boundaries. Put reusable fakes in `src/Fakes/` and keep them simple.
- Use Bun fake timers for timer-driven tests.
- Every hand-written `oxlint-disable` directive must state its concrete reason.
- Sequential `await` in a loop must have an `oxlint-disable-next-line` explaining why ordering is required.
- Run `bun run checks` before handing off implementation changes; completion means the command exits successfully.

## Conditional guidance

- **Commits:** Before creating a commit, read `docs/agents/commits.md`.

## Agent skills

- **Issues and pull requests:** Before reading or writing GitHub issues or pull requests, read `docs/agents/issue-tracker.md`.
- **Triage:** Before applying triage roles, read `docs/agents/triage-labels.md`.
- **Domain docs:** Before relying on domain vocabulary or architectural decisions, read `docs/agents/domain.md`.

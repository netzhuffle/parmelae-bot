# Repository Guidelines

## Project
- Stack: `bun` + `TypeScript` + `Prisma` + `LangChain/LangGraph` + `Telegraf` + `Inversify`
- Tests: `bun:test` with colocated `*.test.ts`
- Quality tooling: `oxfmt` + `oxlint` + `yaml-validator`
- Package manager/runtime: `bun`

## Working Defaults For Codex
- Keep changes focused and minimal; avoid unrelated refactors.
- Fix bugs at root cause, not only symptoms.
- Add or update regression tests for behavior changes and bug fixes when practical.
- Keep touched documentation aligned with the implemented behavior.
- Do not edit generated artifacts unless the task explicitly requires it.
- Preserve unrelated user changes in the worktree.
- Before handoff on implementation changes, run `bun run checks`.

## Project Structure & Conventions
- Source code lives in `src/`; support scripts live in `scripts/`; card data lives in `resources/`.
- Services hold business logic; repositories stay focused on CRUD, queries, and mapping.
- LangChain tools live in `src/Tools/` and use `ToolContext` / `getToolContext(config)` for dependencies. New tools must also be registered in `ChatGptAgentService`.
- Prefer fakes over mocks for external boundaries. Shared fakes belong in `src/Fakes/` and should stay simple.
- Error classes should be specific, descriptive, and colocated with the code that uses them. Use assertions only for programmer errors or invariants.
- Import Prisma model and enum types directly from generated files, not from barrel files.
- Public exported classes and non-trivial exported methods should have concise JSDoc focused on non-obvious behavior or business rules.

## Commands
- Install deps: `bun install`
- Run app: `bun src/index.ts`
- Format: `bun run format`
- Lint: `bun run lint`
- Validate all: `bun run checks`
- Tests: `bun test src scripts`
- Task overview: `bun run tasks`

## Testing Guidelines
- Keep tests next to the implementation using `*.test.ts`.
- Prefer behavior-focused tests over implementation-detail tests.
- For timer-driven code, use Bun fake timers instead of real waiting.
- Keep tests deterministic: no real network calls, no flaky time dependencies, no hidden shared state between tests.

## Taskmaster
- Taskmaster is available in this repo, but use it only when the user wants task tracking or asks about next/planned work.
- Common examples:
  - `bun run tasks`
  - `bunx --bun task-master next`
  - `bunx --bun task-master show <id>`
  - `bunx --bun task-master set-status --id=<id> --status=in-progress`

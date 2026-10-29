# Parmelä Bot

> “The most helpful bot you’ve ever seen on Telegram.”

A personal Telegram bot for AI conversations, tool calling, and Pokémon TCG Pocket collection tracking. It uses Bun, TypeScript, LangChain/LangGraph, Telegraf, and Prisma with SQLite.

## Local development

Use the Bun version in [.bun-version](.bun-version). Prisma code generation also requires Node.js.

```fish
bun install --frozen-lockfile
cp .env.example .env
```

Fill in `.env` using [.env.example](.env.example). [src/Config.ts](src/Config.ts) defines required values.

```fish
bun run migrate
bun run run-dev
```

## Dependencies

[Release-age policy](docs/dependency-policy.md): urgent-update exceptions. [Validation benchmarks](docs/validation-benchmarks.md): rationale for the checker split.

## Architecture

Tools extend the agent with search, images, Pokémon cards, scheduling, and other integrations. [Coding standards](CODING_STANDARDS.md#tool-composition) define tool registration and invocation lifecycles; [tool-call history](CODING_STANDARDS.md#tool-call-history) defines announcement and persistence invariants.

[Web-search research](docs/openai-web-search-research.md): dated migration investigation, not an implementation contract.

## Operations

- [Deployment](docs/deployment.md): server prerequisites, release activation, and service commands.
- [Backup and restore](docs/backup-restore-procedures.md): backup verification and database recovery.

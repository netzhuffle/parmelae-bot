# Parmelä Bot

A personal Telegram bot for AI conversations, tool calling, and Pokémon TCG Pocket collection tracking. It uses Bun, TypeScript, LangChain/LangGraph, Telegraf, and Prisma with SQLite.

## Local development

Use the Bun version in [.bun-version](.bun-version). Prisma code generation also requires Node.js.

```fish
bun install
cp .env.example .env
```

Fill in `.env` using [.env.example](.env.example). The configuration validator in [src/Config.ts](src/Config.ts) defines required values; this includes Helicone, GitHub, SerpAPI, chat allowlisting, and commit announcement destinations as well as Telegram and OpenAI credentials.

```fish
bun run migrate
bun run run-dev
```

[package.json](package.json) defines the development and validation commands. Read [CODING_STANDARDS.md](CODING_STANDARDS.md) before implementation or review; [AGENTS.md](AGENTS.md) routes agent work to task-specific guidance.

## Architecture

Tools extend the agent with search, images, Pokémon cards, scheduling, and other integrations. [Coding standards](CODING_STANDARDS.md#tool-composition) define tool registration and invocation lifecycles; [tool-call history](CODING_STANDARDS.md#tool-call-history) defines announcement and persistence invariants.

[Web-search research](docs/openai-web-search-research.md): dated migration investigation, not an implementation contract.

## Operations

- [Deployment](docs/deployment.md): server prerequisites, release activation, and service commands.
- [Backup and restore](docs/backup-restore-procedures.md): backup verification and database recovery.

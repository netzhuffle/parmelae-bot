# Progress

## What Works
- Telegram bot starts and handles messages via `Bot` using Telegraf.
- AI-driven chat responses via `ChatGptService` and image generation via `DallEService`.
- Scheduled messages via `ScheduledMessageService`.
- GitHub commit announcements via `GitHubService`.
- Pokemon TCG card database synchronization via `PokemonTcgPocketService`.
- Dependency injection configured in `inversify.config.ts`.
- Database operations via Prisma repositories.
- Basic test coverage for `ChatGptService` and `PokemonTcgPocketService`.

## What's Left to Build
- Add Jest test suites for all services (`DallEService`, `ScheduledMessageService`, `TelegramMessageService`, etc.).
- Implement tests for repositories and fakes under `/src/Repositories` and `/src/Fakes`.
- Validate environment variables at startup with descriptive errors.
- Enhance error handling with specific error classes.
- Configure CI pipeline to automate `npm run checks` on push.
- Improve vector store usage and retrieval strategies.
- Document public methods with JSDoc and update README accordingly.

## Current Status
- Core functionality implemented for messaging, AI integrations, scheduling, and data persistence.
- Memory bank initialized and project documentation underway.
- Partial test coverage exists; majority of modules untested.

## Known Issues
- Incomplete test coverage across most modules.
- Missing environment variable validation leads to runtime errors.
- Potential formatting/linting issues due to apostroph characters.
- No CI/CD pipeline configured.

## Evolution of Project Decisions
- Started as a personal fun project exploring AI and Telegram bots.
- Adopted Inversify for DI and Prisma for ORM to improve maintainability.
- Introduced Strategy and Factory patterns for extensible reply logic.
- Integrated LangChain, LangGraph, and hnswlib-node for advanced LLM workflows.
- Structured code into services, repositories, tools, and fakes to enforce separation of concerns. 
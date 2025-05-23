# Progress

## What Works
- Telegram bot starts and handles messages via `Bot` using Telegraf.
- AI-driven chat responses via `ChatGptService` and image generation via `DallEService`.
- Scheduled messages via `ScheduledMessageService`.
- GitHub commit announcements via `GitHubService`.
- Pokemon TCG card database synchronization via `PokemonTcgPocketService`.
- PokemonTcgPocket booster statistics enhanced with diamond, tradable, and all rarity columns including new probability calculations.
- Dependency injection configured in `inversify.config.ts`.
- Database operations via Prisma repositories.
- Basic test coverage for `ChatGptService` and `PokemonTcgPocketService`.
- Jest test suite for `PokemonTcgPocketProbabilityService` now fully implemented and passing, covering normal, diamond, shiny, and god-pack scenarios.
- AgentStateGraphFactory, AgentNodeFactory, and ToolsNodeFactory now have robust, idiomatic Jest test coverage with strict type safety and no use of `any` or unsafe assignments. All checks (format, lint, build, test) pass and codebase is fully compliant for these modules.
- Tool call announcements are now handled by ToolCallAnnouncementNodeFactory, combining all tool calls for a message into one announcement (newline-separated), with AIMessage content as the first line if present. CallbackHandlerFactory was removed; CallbackHandler is now injected directly. Tests for ToolCallAnnouncementNodeFactory are comprehensive and up to date. All code, linter, and tests are clean and passing.
- **Fallback for empty tool names and all related tests have been removed. Tool names are now always assumed to be non-empty, and the code/tests reflect this guarantee.**
- **Tool name constant pattern (e.g., INTERMEDIATE_ANSWER_TOOL_NAME) is now used for all tool name checks, ensuring robust and future-proof comparisons.**

## What's Left to Build
- Add Jest test suites for all services (`DallEService`, `ScheduledMessageService`, `TelegramMessageService`, etc.) and new classes (e.g., `AgentStateGraphFactory`).
- Implement tests for repositories and fakes under `/src/Repositories` and `/src/Fakes`.
- Validate environment variables at startup with descriptive errors.
- Enhance error handling with specific error classes.
- Configure CI pipeline to automate `npm run checks` on push.
- Improve vector store usage and retrieval strategies.
- Review memory bank and update with recent feature additions and ensure CI pipeline automation.
- **Future task:** Remove CommandReplyStrategy and CommandService, as /xyz commands are no longer useful.
- Persist tool calls and tool responses in the database and include them in message histories for LLM workflows.

## Current Status
- Core functionality implemented for messaging, AI integrations, scheduling, and data persistence.
- Memory bank initialized and project documentation underway.
- Partial test coverage exists; majority of modules untested.
- Booster stats enhancement for PokemonTcgPocket implemented and tested.
- AgentStateGraph and node factories now fully tested and compliant.
- Tool call announcement logic is robust, unified, and content-aware, with comprehensive tests.
- **Tool names are always non-empty; code and tests do not handle empty tool names.**
- **Tool name constants are used for all tool name checks.**
- **Work initiated to persist tool calls and tool responses in the database and include them in message histories.**

## Known Issues
- Incomplete test coverage across most modules.
- Missing environment variable validation leads to runtime errors.
- Potential formatting/linting issues due to apostroph characters.
- No CI/CD pipeline configured.
- Tool calls and tool responses are not yet persisted or included in message histories, leading to incomplete LLM context.

## Evolution of Project Decisions
- Started as a personal fun project exploring AI and Telegram bots.
- Adopted Inversify for DI and Prisma for ORM to improve maintainability.
- Introduced Strategy and Factory patterns for extensible reply logic.
- Integrated LangChain, LangGraph, and hnswlib-node for advanced LLM workflows.
- Structured code into services, repositories, tools, and fakes to enforce separation of concerns. 
- **Decision to persist tool calls and tool responses for improved LLM context and reliability.** 
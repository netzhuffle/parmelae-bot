# Active Context

## Current Work Focus
- Populating memory bank and documenting project structure.
- Reviewing codebase to ensure memory bank accuracy.
- Refactoring and testing AgentStateGraph-related modules for robust, type-safe coverage.
- Tool call announcements are now handled exclusively by ToolCallAnnouncementNodeFactory, with all tool calls for a single message combined into one announcement (newline-separated), and AIMessage content included as the first line if present.
- **Tool name fallback logic removed:** ToolCallAnnouncementNodeFactory and its tests no longer check for or handle empty tool names. Tool names are now always assumed to be non-empty, and the code/tests reflect this guarantee.
- **Tool name constants pattern:** Tool name constants (e.g., INTERMEDIATE_ANSWER_TOOL_NAME) are now exported and used everywhere for tool name checks, preventing property shadowing issues and ensuring robust, future-proof comparisons.

## Recent Changes
- Initialized .ai-memory with core memory bank files.
- Completed initial project analysis: README, package.json, and src directory structure.
- Extended PokemonTcgPocketProbabilityService with TRADABLE_RARITIES and calculateNewTradableCardProbability; updated PokemonTcgPocketService to output booster stats with separate diamond, tradable, and all columns including new probability calculations.
- Refined and optimized Jest test suite for PokemonTcgPocketProbabilityService: updated and clarified test cases for normal, diamond, shiny, and god-pack probabilities, added config-based isolation of god-pack branch, and improved test maintainability.
- Added AgentStateGraphFactory for constructing LangGraph state graphs for agent workflows.
- Added minimal, contract-based black-box Jest test for AgentStateGraphFactory; all checks and tests pass.
- Refactored AgentStateGraphFactory, AgentNodeFactory, and ToolsNodeFactory to have strict, idiomatic Jest test coverage using real LangChain messages and robust type assertions. Removed all use of `any` and unsafe assignments. All checks (format, lint, build, test) now pass.
- ToolCallAnnouncementNodeFactory now combines all tool call announcements for a single message into one, separated by newlines, and includes AIMessage content as the first line if present. Edge cases (empty args, empty string, no tool calls, etc.) are handled and tested. Tests for ToolCallAnnouncementNodeFactory are comprehensive and up to date. CallbackHandlerFactory was removed; CallbackHandler is now injected directly. All code, linter, and tests are clean and passing.
- **Removed fallback for empty tool names and all related tests.**
- **Tool name constant pattern adopted for all tool name checks.**

## Next Steps
- Populate activeContext.md and progress.md with project details.
- Identify modules lacking test coverage and plan test implementations.
- Generate and maintain minimal, contract-based Jest tests for new factories/classes (e.g., AgentStateGraphFactory).
- Refactor code to adhere to best practices and patterns.
- Configure CI pipeline to automate npm run checks.
- Continue enhancing test coverage across modules and review additional feature enhancements.
- **Future task:** Remove CommandReplyStrategy and CommandService, as /xyz commands are no longer useful.

## Active Decisions and Considerations
- Utilizing Inversify for consistent dependency injection.
- Emphasizing Strategy and Repository patterns for modularity.
- Prioritizing test coverage improvements before new feature development.
- Considering enhanced input validation and specific error types.
- Tool call announcements are now unified and content-aware, improving user feedback and reducing message noise.
- **Tool names are always non-empty; code and tests do not handle empty tool names.**
- **Tool name constants are used for all tool name checks.**

## Important Patterns and Preferences
- DI container configured in inversify.config.ts for class wiring.
- Services manage business logic; Repositories handle data persistence.
- Naming conventions: Service.ts, Repository.ts, Tool.ts, Fake.ts.
- CI checks include formatting (Prettier), schema formatting (Prisma), linting (ESLint), YAML validation, and testing (Jest).
- Never attempt to fix apostroph (’) linting issues; ask the user to correct them manually.

## Learnings and Project Insights
- AI integrations (LangChain, LangGraph, OpenAI) are encapsulated in Tools.
- `Bot` class uses Telegraf to delegate messages through ReplyStrategyFinder.
- PokemonTcgPocketService synchronizes YAML-based card data to the database.
- Memory bank is critical for AI assistant context continuity. 
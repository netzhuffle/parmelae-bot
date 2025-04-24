# Active Context

## Current Work Focus
- Populating memory bank and documenting project structure.
- Reviewing codebase to ensure memory bank accuracy.

## Recent Changes
- Initialized .ai-memory with core memory bank files.
- Completed initial project analysis: README, package.json, and src directory structure.

## Next Steps
- Populate activeContext.md and progress.md with project details.
- Identify modules lacking test coverage and plan test implementations.
- Refactor code to adhere to best practices and patterns.
- Configure CI pipeline to automate npm run checks.

## Active Decisions and Considerations
- Utilizing Inversify for consistent dependency injection.
- Emphasizing Strategy and Repository patterns for modularity.
- Prioritizing test coverage improvements before new feature development.
- Considering enhanced input validation and specific error types.

## Important Patterns and Preferences
- DI container configured in inversify.config.ts for class wiring.
- Services manage business logic; Repositories handle data persistence.
- Naming conventions: Service.ts, Repository.ts, Tool.ts, Fake.ts.
- CI checks include formatting (Prettier), schema formatting (Prisma), linting (ESLint), YAML validation, and testing (Jest).

## Learnings and Project Insights
- AI integrations (LangChain, LangGraph, OpenAI) are encapsulated in Tools.
- `Bot` class uses Telegraf to delegate messages through ReplyStrategyFinder.
- PokemonTcgPocketService synchronizes YAML-based card data to the database.
- Memory bank is critical for AI assistant context continuity. 
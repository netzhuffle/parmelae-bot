# Active Context

## Current Work Focus
- Persisting tool calls and tool responses in the database and including them in message histories for LLM workflows.

## Next Steps (Detailed)
1. Update `schema.prisma`:
   - Add a `toolCalls` JSON field to the `Message` table.
   - Add a new `ToolMessage` table with the following fields:
     - `id`: Primary key
     - `message` relation: Foreign key to the related `Message`
     - `toolCallId`: Identifier for the tool call (string or int, as appropriate)
     - `text`: The tool response or content (string)
2. Update the callback in `ToolCallAnnouncementNodeFactory.ts` to return the message ID from the database, so the tool call announcement node can save the `tool_calls` JSON from the `AIMessage`.
3. Implement logic to record tool response messages to the database in a new graph node.
4. Update `MessageHistoryService.ts` to include tool calls and tool responses when fetching message history.
5. Review and update test coverage for all new persistence logic.
6. Ensure all documentation and memory bank files reflect the new persistence model and logic.

## Recent Changes
- Populated and maintained the memory bank with project structure and documentation.
- Refactored and tested AgentStateGraph-related modules for robust, type-safe coverage.
- Unified tool call announcements via ToolCallAnnouncementNodeFactory, combining all tool calls for a single message into one announcement, with AIMessage content as the first line if present.
- Removed fallback logic for empty tool names; tool names are now always non-empty and checked via exported constants.
- Adopted tool name constants pattern for all tool name checks.
- Initiated work to persist tool calls and tool responses in the database, including them in message histories.

## Active Decisions and Considerations
- Utilizing Inversify for consistent dependency injection.
- Emphasizing Strategy and Repository patterns for modularity.
- Prioritizing test coverage improvements before new feature development.
- Considering enhanced input validation and specific error types.
- Tool call announcements are now unified and content-aware, improving user feedback and reducing message noise.
- Tool names are always non-empty; code and tests do not handle empty tool names.
- Tool name constants are used for all tool name checks.
- Tool calls and tool responses will be persisted and included in LLM message histories for improved context.
- **ToolMessage table fields:** `id`, `message` relation, `toolCallId`, `text`.

## Important Patterns and Preferences
- DI container configured in inversify.config.ts for class wiring.
- Services manage business logic; Repositories handle data persistence.
- Naming conventions: Service.ts, Repository.ts, Tool.ts, Fake.ts.
- CI checks include formatting (Prettier), schema formatting (Prisma), linting (ESLint), YAML validation, and testing (Jest).
- Never attempt to fix apostroph (’) linting issues; ask the user to correct them manually.
- ToolMessage table and toolCalls JSON field will be used for tool call persistence.

## Learnings and Project Insights
- AI integrations (LangChain, LangGraph, OpenAI) are encapsulated in Tools.
- `Bot` class uses Telegraf to delegate messages through ReplyStrategyFinder.
- PokemonTcgPocketService synchronizes YAML-based card data to the database.
- Memory bank is critical for AI assistant context continuity.
- Persisting tool calls and responses will improve LLM context and reliability. 
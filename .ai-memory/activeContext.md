# Active Context

## Current Work Focus
- **Implementing step 3 of tool call persistence:** Record tool response messages to the database in a new graph node.

## Next Steps (Detailed)
1. ✅ Update `schema.prisma` - COMPLETED
2. ✅ **Update the callback in `ToolCallAnnouncementNodeFactory.ts` to return the message ID from the database, so the tool call announcement node can save the `tool_calls` JSON from the `AIMessage` - COMPLETED**
3. **IN PROGRESS:** Implement logic to record tool response messages to the database in a new graph node.
4. Update `MessageHistoryService.ts` to include tool calls and tool responses when fetching message history.
5. Review and update test coverage for all new persistence logic.
6. Ensure all documentation and memory bank files reflect the new persistence model and logic.
7. **Future task:** Handle tool call linkage for tools that send messages directly - tools like `diceTool`, `dallETool`, etc. call `telegram.sendDice()`, `telegram.sendPhoto()` etc. which store messages in the database, but these messages are not linked back to the original tool call that triggered them. This breaks LLM context because the conversation history shows the tool call and the resulting message as separate unconnected entries. Additionally, `IntermediateAnswerTool` has a worse problem: it sends messages directly AND its tool calls are filtered out from announcements, so the tool calls are never persisted to the database at all (no record of the tool call exists). Need a solution to link tool-generated messages back to their originating tool calls, possibly through the ToolMessage table or by enhancing the tool execution context.

## Recent Changes
- Populated and maintained the memory bank with project structure and documentation.
- Refactored and tested AgentStateGraph-related modules for robust, type-safe coverage.
- Unified tool call announcements via ToolCallAnnouncementNodeFactory, combining all tool calls for a single message into one announcement, with AIMessage content as the first line if present.
- Removed fallback logic for empty tool names; tool names are now always non-empty and checked via exported constants.
- Adopted tool name constants pattern for all tool name checks.
- ✅ **Completed schema changes:** Added `toolCalls` JSON field to `Message` table and new `ToolMessage` table with proper fields.
- ✅ **Completed ToolCallAnnouncementNodeFactory updates:** Added dependency injection for MessageRepository, changed callback signature to return Promise<number>, and added logic to persist tool_calls JSON to database.
- ✅ **Updated all callback signatures throughout the codebase:** Modified TelegramService.send to return message ID, updated reply strategies, and ensured type consistency across all components.
- ✅ **Improved API design:** Changed callback signature from `Promise<number>` to `Promise<number | null>` where `null` indicates no message was stored. Updated ToolCallAnnouncementNodeFactory to only persist tool calls when a real message ID is returned (not null). CommandService now returns `null` instead of mock ID `0`.
- ✅ **All formatting, linting, building, and tests now pass.**

## Active Decisions and Considerations
- Utilizing Inversify for consistent dependency injection.
- Emphasizing Strategy and Repository patterns for modularity.
- Prioritizing test coverage improvements before new feature development.
- Considering enhanced input validation and specific error types.
- Tool call announcements are now unified and content-aware, improving user feedback and reducing message noise.
- Tool names are always non-empty; code and tests do not handle empty tool names.
- Tool name constants are used for all tool name checks.
- Tool calls and tool responses will be persisted and included in LLM message histories for improved context.
- ToolMessage table fields: `id`, `message` relation, `toolCallId`, `text`.
- **API design principle:** Callback signatures should return `null` when no persistence occurs, not mock IDs, for semantic correctness.
- **Future consideration:** When CommandService.ts is eventually removed/refactored, the callback signature can be simplified back to `Promise<number>` since CommandService is currently the only component that returns `null` (all other components actually store messages).

## Important Patterns and Preferences
- DI container configured in inversify.config.ts for class wiring.
- Services manage business logic; Repositories handle data persistence.
- Naming conventions: Service.ts, Repository.ts, Tool.ts, Fake.ts.
- CI checks include formatting (Prettier), schema formatting (Prisma), linting (ESLint), YAML validation, and testing (Jest).
- Never attempt to fix apostroph (') linting issues; ask the user to correct them manually.
- ToolMessage table and toolCalls JSON field will be used for tool call persistence.
- Callback signatures that don't store messages should return `Promise<number | null>` and return `null` when no storage occurs.

## Learnings and Project Insights
- AI integrations (LangChain, LangGraph, OpenAI) are encapsulated in Tools.
- `Bot` class uses Telegraf to delegate messages through ReplyStrategyFinder.
- PokemonTcgPocketService synchronizes YAML-based card data to the database.
- Memory bank is critical for AI assistant context continuity.
- Persisting tool calls and responses will improve LLM context and reliability.
- **Implemented flow:** ToolCallAnnouncementNodeFactory → BotMentionReplyStrategy → TelegramService.send → TelegramMessageService.store → MessageRepository.store → Returns message ID → MessageRepository.updateToolCalls (only if message ID is not null).
- **API design clarity:** Using proper return types (`null` vs mock IDs) improves code maintainability and prevents logic errors. 
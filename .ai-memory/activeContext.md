# Active Context

## Current Work Focus
- **COMPLETED:** Tool call and tool response persistence implementation with consistent database storage.
- **COMPLETED:** Step 4 - Update MessageHistoryService to include tool calls and tool responses in message history for improved LLM context.
- **COMPLETED:** Fix ConversationService content extraction to remove tool call announcements from AI message content when tool calls are present.
- **COMPLETED:** Refactor ConversationService for improved code organization and maintainability.
- **COMPLETED:** Critical bug fix - ensure messages with tool calls are never skipped from conversation history, regardless of text content.

## Next Steps (Detailed)
1. ✅ Update `schema.prisma` - COMPLETED
2. ✅ **Update the callback in `ToolCallAnnouncementNodeFactory.ts` to return the message ID from the database, so the tool call announcement node can save the `tool_calls` JSON from the `AIMessage` - COMPLETED**
3. ✅ **Implement logic to record tool response messages to the database in a new graph node - COMPLETED**
4. ✅ **Update `MessageHistoryService.ts` to include tool calls and tool responses when fetching message history - COMPLETED**
   - ✅ Update Types.ts: Add MessageWithUserAndToolMessages, rename MessageWithUserAndReplyTo to MessageWithUserReplyToAndToolMessages
   - ✅ Update MessageRepository: Modify get() and getLastChatMessage() to include toolMessages join
   - ✅ Update MessageHistoryService: Change getHistory() return type to use enhanced types
   - ✅ Update ConversationService: Handle tool calls/responses conversion to LangChain messages (AIMessage with tool_calls, ToolMessage instances)
5. ✅ **Fix ConversationService content extraction for tool calls - COMPLETED**
   - ✅ Create utility function to extract clean AI content from messages with tool calls
   - ✅ Handle cases where message starts with "[" (only tool calls) vs has AI content before tool calls
   - ✅ Update ConversationService to use clean content extraction
   - ✅ Add comprehensive tests for content extraction scenarios
6. Review and update test coverage for all new persistence logic.
7. Ensure all documentation and memory bank files reflect the new persistence model and logic.
8. **Future task:** Handle tool call linkage for tools that send messages directly - tools like `diceTool`, `dallETool`, etc. call `telegram.sendDice()`, `telegram.sendPhoto()` etc. which store messages in the database, but these messages are not linked back to the original tool call that triggered them. This breaks LLM context because the conversation history shows the tool call and the resulting message as separate unconnected entries. Additionally, `IntermediateAnswerTool` has a worse problem: it sends messages directly AND its tool calls are filtered out from announcements, so the tool calls are never persisted to the database at all (no record of the tool call exists). Need a solution to link tool-generated messages back to their originating tool calls, possibly through the ToolMessage table or by enhancing the tool execution context.

## Recent Changes
- Populated and maintained the memory bank with project structure and documentation.
- Refactored and tested AgentStateGraph-related modules for robust, type-safe coverage.
- Unified tool call announcements via ToolCallAnnouncementNodeFactory, combining all tool calls for a single message into one announcement, with AIMessage content as the first line if present.
- Removed fallback logic for empty tool names; tool names are now always non-empty and checked via exported constants.
- Adopted tool name constants pattern for all tool name checks.
- ✅ **Completed schema changes:** Added `toolCalls` JSON field to `Message` table and new `ToolMessage` table with proper fields.
- ✅ **Completed ToolCallAnnouncementNodeFactory updates:** Removed MessageRepository dependency, changed to store context for later persistence instead of immediate persistence.
- ✅ **Created ToolResponsePersistenceNodeFactory:** Handles atomic persistence of tool calls and responses using direct repository access.
- ✅ **Renamed ToolContextAnnotation to StateAnnotation:** Better reflects that it stores both messages and tool execution context.
- ✅ **Implemented selective tool call persistence:** Only tool calls that have corresponding responses are stored in the database.
- ✅ **Updated graph flow:** Added toolResponsePersistence node between tools and agent for consistent persistence.
- ✅ **Enhanced MessageHistoryService and ConversationService:** Tool calls and tool responses are now included in LLM message histories with proper LangChain message types (AIMessage with tool_calls, ToolMessage instances).
- ✅ **Fixed ConversationService content extraction:** Implemented extractAIMessageContent() utility function to remove tool call announcements from AI message content, preventing duplication while preserving clean AI responses. Handles edge cases like messages with only tool calls or whitespace-only content.
- ✅ **Refactored ConversationService architecture:** Improved code organization by moving extractAIMessageContent to private method and breaking down the massive getConversation method into focused private methods (shouldSkipMessage, buildMessageContent, isAssistantMessage, processAssistantMessage, processUserMessage, parseToolCalls, createToolMessages). Enhanced maintainability while preserving all existing functionality and test coverage.
- ✅ **Optimized ConversationService performance:** Moved buildMessageContent() call to only execute for user messages where the content is actually used, avoiding unnecessary async work for assistant messages. This improves performance especially when processing assistant messages with images.
- ✅ **Fixed critical tool calls bug:** Updated shouldSkipMessage() method to never skip messages containing tool calls, regardless of text content (empty, missing, or too long). Tool calls are essential for conversation context and LLM functionality. Added comprehensive tests to verify the fix (2 new test cases, total tests increased to 206).
- ✅ **All formatting, linting, building, and tests now pass.**

## Active Decisions and Considerations
- Utilizing Inversify for consistent dependency injection.
- Emphasizing Strategy and Repository patterns for modularity.
- Prioritizing test coverage improvements before new feature development.
- Considering enhanced input validation and specific error types.
- Tool call announcements are now unified and content-aware, improving user feedback and reducing message noise.
- Tool names are always non-empty; code and tests do not handle empty tool names.
- Tool name constants are used for all tool name checks.
- Tool calls and tool responses are now persisted and included in LLM message histories for improved context.
- ToolMessage table fields: `id`, `message` relation, `toolCallId`, `text`.
- **Consistent persistence principle:** Tool calls are only persisted if they have corresponding responses, ensuring database consistency.
- **Hybrid architecture:** ToolCallAnnouncementNodeFactory uses callbacks for flexibility in communication, but direct repository access for persistence operations.

## Important Patterns and Preferences
- DI container configured in inversify.config.ts for class wiring.
- Services manage business logic; Repositories handle data persistence.
- Naming conventions: Service.ts, Repository.ts, Tool.ts, Fake.ts.
- CI checks include formatting (Prettier), schema formatting (Prisma), linting (ESLint), YAML validation, and testing (Jest).
- Never attempt to fix apostroph (') linting issues; ask the user to correct them manually.
- ToolMessage table and toolCalls JSON field are used for tool call persistence.
- StateAnnotation provides enhanced graph state with tool execution context.
- **Persistence flow:** ToolCallAnnouncementNodeFactory → stores context → tools execute → ToolResponsePersistenceNodeFactory → atomic persistence of tool calls + responses.

## Learnings and Project Insights
- AI integrations (LangChain, LangGraph, OpenAI) are encapsulated in Tools.
- `Bot` class uses Telegraf to delegate messages through ReplyStrategyFinder.
- PokemonTcgPocketService synchronizes YAML-based card data to the database.
- Memory bank is critical for AI assistant context continuity.
- **Implemented consistent tool persistence:** Tool calls and responses are now atomically persisted, ensuring database consistency and improved LLM context.
- **Graph state enhancement:** StateAnnotation provides tool execution context tracking across graph nodes.
- **Selective persistence:** Only tool calls with responses are stored, preventing orphaned data and ensuring meaningful persistence.
- **Clean separation of concerns:** Announcement handles communication, persistence handles database operations, both use appropriate patterns (callbacks vs direct access). 
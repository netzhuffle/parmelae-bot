# Active Context

## Current Work Focus
- **NEW PRIORITY TASK:** Tool Call Message Linkage Implementation
- **COMPLETED:** Tool call and tool response persistence implementation with consistent database storage.
- **COMPLETED:** Step 4 - Update MessageHistoryService to include tool calls and tool responses in message history for improved LLM context.
- **COMPLETED:** Fix ConversationService content extraction to remove tool call announcements from AI message content when tool calls are present.
- **COMPLETED:** Refactor ConversationService for improved code organization and maintainability.
- **COMPLETED:** Critical bug fix - ensure messages with tool calls are never skipped from conversation history, regardless of text content.

## Next Steps (Detailed) - Tool Call Message Linkage

### Problem Statement
The bot replies to the original user message, creating a reply chain that skips intermediate tool call messages. When `MessageHistoryService` follows reply chains, it jumps from the original request directly to the final response, missing all the tool call messages that contain the reasoning/context. This breaks LLM context because the AI can't see the tool calls and responses that led to the conclusion.

**Current Flow:**
1. User sends message → stored in DB
2. Agent processes → creates tool call announcement messages → stored in DB  
3. Tools execute → create tool response messages → stored in DB
4. Agent generates final response → bot replies to original user message → stored in DB
5. Later conversation retrieval follows reply chain: original message → final response (skipping tool messages)

**Required Solution:**
Link final response messages to their associated tool call/response messages so that conversation history includes complete tool interaction context.

### Implementation Tasks

#### Task 1: Database Schema Update
- **File:** `prisma/schema.prisma`
- **Action:** Add `toolCallMessages Message[]` relation to `Message` model
- **Details:** This creates a many-to-many relationship allowing final response messages to reference their associated tool call/response messages
- **Migration:** Create and run Prisma migration for the new relation
- **Types Update:** Update `src/Repositories/Types.ts` to include the new relation in relevant message types

#### Task 2: State Annotation Enhancement  
- **File:** `src/AgentStateGraph/StateAnnotation.ts`
- **Action:** Add `toolCallMessageIds: number[]` field to `ToolExecutionState` interface
- **Purpose:** Accumulate message IDs as tool call announcements and responses are created during graph execution
- **Usage:** This array will collect all tool-related message IDs that should be linked to the final response

#### Task 3: Tool Call Announcement Tracking
- **File:** `src/AgentStateGraph/ToolCallAnnouncementNodeFactory.ts`
- **Action:** Update to store announcement message ID in state when callback returns message ID
- **Details:** Modify the callback handling to capture the returned message ID from `announceToolCall` and add it to `state.toolExecution.toolCallMessageIds`
- **Context:** The `announceToolCall` callback already returns `Promise<number | null>` - we need to capture this ID

#### Task 4: Tool Response Tracking  
- **File:** `src/AgentStateGraph/ToolResponsePersistenceNodeFactory.ts`
- **Action:** Update to store tool response message IDs in state
- **Details:** When tool response messages are created and stored, add their IDs to `state.toolExecution.toolCallMessageIds`
- **Context:** This node already handles tool response persistence - extend it to track message IDs

#### Task 5: Agent Service Return Enhancement
- **File:** `src/ChatGptAgentService.ts`
- **Action:** Modify `generate()` method to return both response content and tool call message IDs
- **Current Return:** `Promise<ChatGptMessage>` (contains role and content)
- **New Return:** `Promise<{ message: ChatGptMessage; toolCallMessageIds: number[] }>`
- **Implementation:** Extract `toolCallMessageIds` from final graph state (`agentOutput.toolExecution.toolCallMessageIds`)
- **Context:** Method is called by `ReplyGenerator.generate()` in reply strategies

#### Task 6: Reply Strategy Updates
- **Files:** 
  - `src/ReplyStrategies/BotMentionReplyStrategy.ts`
  - `src/ReplyStrategies/RandomizedGeneratedReplyStrategy.ts`
- **Action:** Update to handle tool call message IDs from agent service
- **Current Flow:** `replyGenerator.generate()` → `telegram.reply()`
- **New Flow:** 
  1. Get response and tool call message IDs from `replyGenerator.generate()`
  2. Store reply message via `telegram.reply()` 
  3. Update stored message with tool call message IDs via `MessageRepository`
- **Context:** These strategies call `ReplyGenerator.generate()` which calls `ChatGptAgentService.generate()`

#### Task 7: Reply Generator Enhancement
- **File:** `src/MessageGenerators/ReplyGenerator.ts`
- **Action:** Update `generate()` method to handle enhanced agent service response
- **Current:** Returns `Promise<string>` (reply text)
- **New:** Return both reply text and tool call message IDs, or handle the linking internally
- **Context:** This is the bridge between reply strategies and the agent service

#### Task 8: Message Repository Enhancement
- **File:** `src/Repositories/MessageRepository.ts`
- **Action:** Add method to update message with tool call message IDs
- **Method:** `async updateToolCallMessages(messageId: number, toolCallMessageIds: number[]): Promise<void>`
- **Implementation:** Use Prisma's `connect` operation to link existing messages
- **Context:** Repository already has `updateToolCalls()` method for JSON data

#### Task 9: Message History Service Enhancement  
- **File:** `src/MessageHistoryService.ts`
- **Action:** Update `getHistoryForMessages()` to include tool call messages when present
- **Logic:** When processing a message with `toolCallMessages`, include them in chronological order
- **Ordering:** original message → tool call messages (chronological) → final response
- **Context:** Current logic follows reply chains via `replyToMessage` - extend to include `toolCallMessages`

#### Task 10: Types Enhancement
- **File:** `src/Repositories/Types.ts`
- **Action:** Update message types to include `toolCallMessages` relation
- **Types to Update:**
  - `MessageWithUserAndToolMessages` (add `toolCallMessages: Message[]`)
  - Consider if other types need the relation based on usage patterns
- **Context:** These types are used throughout the message history and conversation services

#### Task 11: Testing and Integration
- **Files:** All corresponding `.test.ts` files
- **Action:** Update tests to handle new functionality
- **Focus Areas:**
  - Agent service returning enhanced response
  - Message repository tool call message linking
  - Message history including tool call messages
  - Conversation service handling enhanced message types
- **Context:** Existing test patterns use fakes for external dependencies

### Technical Context

**Key Files and Their Roles:**
- `AgentStateGraphFactory.ts`: Orchestrates the graph flow (agent → toolCallAnnouncement → tools → toolResponsePersistence → agent)
- `StateAnnotation.ts`: Defines graph state including tool execution context
- `ChatGptAgentService.ts`: Main entry point for AI generation, returns final response
- `ReplyGenerator.ts`: Bridge between reply strategies and agent service
- `TelegramService.ts`: Handles message sending and storage via `reply()` method
- `MessageRepository.ts`: Database operations for messages
- `MessageHistoryService.ts`: Retrieves conversation history following reply chains

**Current Tool Call Flow:**
1. `ToolCallAnnouncementNodeFactory` → announces tool calls → returns message ID
2. `ToolsNodeFactory` → executes tools → may create additional messages
3. `ToolResponsePersistenceNodeFactory` → stores tool responses → creates ToolMessage records
4. Final AI response → sent via `telegram.reply()` → creates reply chain

**Database Schema Context:**
- `Message` table has `toolCalls` JSON field and `toolMessages` relation (completed)
- `ToolMessage` table links tool responses to messages (completed)
- Need to add `toolCallMessages` many-to-many relation for linking final responses to tool call messages

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
- **NEW: Tool Call Message Linkage Principle:** Final response messages must be linked to their associated tool call/response messages to preserve complete conversation context when following reply chains.

## Important Patterns and Preferences
- DI container configured in inversify.config.ts for class wiring.
- Services manage business logic; Repositories handle data persistence.
- Naming conventions: Service.ts, Repository.ts, Tool.ts, Fake.ts.
- CI checks include formatting (Prettier), schema formatting (Prisma), linting (ESLint), YAML validation, and testing (Jest).
- Never attempt to fix apostroph (') linting issues; ask the user to correct them manually.
- ToolMessage table and toolCalls JSON field are used for tool call persistence.
- StateAnnotation provides enhanced graph state with tool execution context.
- **Persistence flow:** ToolCallAnnouncementNodeFactory → stores context → tools execute → ToolResponsePersistenceNodeFactory → atomic persistence of tool calls + responses.
- **NEW: Message Linkage Pattern:** Use many-to-many relations to link final response messages to their associated tool call messages, enabling complete context preservation in conversation history.

## Learnings and Project Insights
- AI integrations (LangChain, LangGraph, OpenAI) are encapsulated in Tools.
- `Bot` class uses Telegraf to delegate messages through ReplyStrategyFinder.
- PokemonTcgPocketService synchronizes YAML-based card data to the database.
- Memory bank is critical for AI assistant context continuity.
- **Implemented consistent tool persistence:** Tool calls and responses are now atomically persisted, ensuring database consistency and improved LLM context.
- **Graph state enhancement:** StateAnnotation provides tool execution context tracking across graph nodes.
- **Selective persistence:** Only tool calls with responses are stored, preventing orphaned data and ensuring meaningful persistence.
- **Clean separation of concerns:** Announcement handles communication, persistence handles database operations, both use appropriate patterns (callbacks vs direct access).
- **NEW: Reply Chain Context Gap:** Current reply chain following skips tool call messages, breaking LLM context. Tool call message linkage is essential for preserving complete conversation reasoning and context. 
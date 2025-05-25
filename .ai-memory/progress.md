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
- **Tool call and response persistence is fully implemented:** ToolCallAnnouncementNodeFactory stores execution context, ToolResponsePersistenceNodeFactory handles atomic persistence of tool calls and responses, ensuring database consistency and improved LLM context.

## What Works Within the Active Context

### Core Infrastructure
- **Dependency Injection:** Inversify container properly configured for all services and repositories
- **Database Operations:** Prisma-based repositories handle CRUD operations with proper error handling
- **Testing Framework:** Comprehensive Jest test suite with fakes for all external dependencies
- **Code Quality:** ESLint, Prettier, and TypeScript compilation all pass consistently

### Tool Call and Tool Response Persistence (COMPLETED)
- **Schema Updates:** `toolCalls` JSON field added to `Message` table, new `ToolMessage` table created
- **Graph Architecture:** StateAnnotation provides tool execution context across graph nodes
- **Announcement System:** ToolCallAnnouncementNodeFactory handles unified tool call announcements with callback-based persistence
- **Persistence System:** ToolResponsePersistenceNodeFactory provides atomic tool call and response storage
- **Message History Integration:** MessageHistoryService includes tool calls and responses in conversation history
- **LangChain Integration:** ConversationService converts tool calls/responses to proper LangChain message types (AIMessage with tool_calls, ToolMessage instances)
- **Content Extraction:** extractAIMessageContent() utility function removes tool call announcements from AI message content, preventing duplication while preserving clean AI responses
- **Selective Persistence:** Only tool calls with corresponding responses are stored, ensuring database consistency
- **Comprehensive Testing:** Full test coverage for all persistence logic with proper fakes and edge case handling

### Agent State Graph
- **Node Factories:** All node factories (Agent, Tools, ToolCallAnnouncement, ToolResponsePersistence) properly tested and functional
- **State Management:** StateAnnotation handles both messages and tool execution context
- **Graph Flow:** Proper flow from agent → toolCallAnnouncement → tools → toolResponsePersistence → agent
- **Tool Integration:** All tools properly integrated with LangChain and graph execution

### Message Processing
- **Storage:** TelegramMessageService handles message persistence with all relations
- **History:** MessageHistoryService provides conversation context with tool calls/responses included
- **Conversation:** ConversationService creates LangChain conversations with clean content extraction and refactored architecture for improved maintainability
- **Reply Strategies:** Multiple reply strategies handle different message types and contexts

### Pokemon TCG Pocket Integration
- **Service Layer:** PokemonTcgPocketService handles card synchronization and probability calculations
- **Repository:** Database operations for cards, boosters, and ownership tracking
- **Tools:** pokemonCardAddTool, pokemonCardSearchTool, pokemonCardStatsTool all functional
- **Probability System:** Pack opening probability calculations working correctly

## What's Left to Build

### Tool Call Message Linkage Implementation (NEW PRIORITY TASK)

**Problem:** The bot replies to the original user message, creating a reply chain that skips intermediate tool call messages. When `MessageHistoryService` follows reply chains, it jumps from the original request directly to the final response, missing all the tool call messages that contain the reasoning/context. This breaks LLM context because the AI can't see the tool calls and responses that led to the conclusion.

**Solution:** Link final response messages to their associated tool call/response messages so that conversation history includes complete tool interaction context.

#### Implementation Tasks (11 Total)

1. **Database Schema Update** - Add `toolCallMessages Message[]` relation to `Message` model in `schema.prisma`
2. **State Annotation Enhancement** - Add `toolCallMessageIds: number[]` field to `ToolExecutionState` in `StateAnnotation.ts`
3. **Tool Call Announcement Tracking** - Update `ToolCallAnnouncementNodeFactory.ts` to store announcement message ID in state
4. **Tool Response Tracking** - Update `ToolResponsePersistenceNodeFactory.ts` to store tool response message IDs in state
5. **Agent Service Return Enhancement** - Modify `ChatGptAgentService.generate()` to return both response content and tool call message IDs
6. **Reply Strategy Updates** - Update `BotMentionReplyStrategy` and `RandomizedGeneratedReplyStrategy` to handle tool call message IDs
7. **Reply Generator Enhancement** - Update `ReplyGenerator.generate()` to handle enhanced agent service response
8. **Message Repository Enhancement** - Add method to update message with tool call message IDs
9. **Message History Service Enhancement** - Update `getHistoryForMessages()` to include tool call messages when present
10. **Types Enhancement** - Update message types in `Types.ts` to include `toolCallMessages` relation
11. **Testing and Integration** - Update all relevant tests to handle new functionality

#### Technical Implementation Details

**Key Changes Required:**
- Database: Many-to-many relation between messages for tool call linkage
- State Management: Track tool call message IDs during graph execution
- Agent Service: Return enhanced response with tool call message IDs
- Reply Flow: Link final response to tool call messages after storage
- Message History: Include tool call messages when following reply chains

**Files to Modify:**
- `prisma/schema.prisma` - Add toolCallMessages relation
- `src/AgentStateGraph/StateAnnotation.ts` - Add toolCallMessageIds tracking
- `src/AgentStateGraph/ToolCallAnnouncementNodeFactory.ts` - Store announcement message IDs
- `src/AgentStateGraph/ToolResponsePersistenceNodeFactory.ts` - Store response message IDs
- `src/ChatGptAgentService.ts` - Return enhanced response with tool call message IDs
- `src/MessageGenerators/ReplyGenerator.ts` - Handle enhanced agent response
- `src/ReplyStrategies/BotMentionReplyStrategy.ts` - Link tool call messages to final response
- `src/ReplyStrategies/RandomizedGeneratedReplyStrategy.ts` - Link tool call messages to final response
- `src/Repositories/MessageRepository.ts` - Add updateToolCallMessages method
- `src/MessageHistoryService.ts` - Include tool call messages in history
- `src/Repositories/Types.ts` - Add toolCallMessages to message types
- All corresponding `.test.ts` files - Update tests for new functionality

### Documentation and Maintenance
- **Memory Bank Updates:** Ensure all documentation reflects current implementation
- **Test Coverage Review:** Verify comprehensive coverage for all new persistence logic
- **Performance Optimization:** Consider optimization opportunities for message history queries

## Current Status

**All core tool call and tool response persistence functionality is now COMPLETE and fully tested.** The system successfully:

1. ✅ Persists tool calls and responses atomically to the database
2. ✅ Includes tool calls/responses in LLM conversation history
3. ✅ Converts to proper LangChain message types for AI processing
4. ✅ Extracts clean AI content without tool call announcement duplication
5. ✅ Handles all edge cases (only tool calls, whitespace, parsing errors)
6. ✅ Maintains database consistency through selective persistence
7. ✅ Provides comprehensive test coverage with proper fakes

**NEW PRIORITY:** Tool Call Message Linkage implementation to ensure complete conversation context preservation when following reply chains.

The implementation significantly improves LLM context by providing complete tool interaction history, enabling the AI to understand and reference previous tool usage in conversations.

## Known Issues

- Some linting errors remain in test files (MessageHistoryService.test.ts) but these are in existing code not related to the current implementation
- **NEW ISSUE:** Reply chain following skips tool call messages, breaking LLM context for conversations that follow reply chains

## Evolution of Project Decisions

- **Initial Approach:** Immediate persistence in ToolCallAnnouncementNodeFactory
- **Refined Approach:** Callback-based context storage + atomic persistence in separate node
- **Final Architecture:** Hybrid approach with ToolCallAnnouncementNodeFactory handling announcements and ToolResponsePersistenceNodeFactory handling database operations
- **Content Strategy:** Added content extraction to prevent duplication between AI responses and tool call announcements in LLM context
- **NEW EVOLUTION:** Tool Call Message Linkage to preserve complete conversation context when following reply chains

### 🔄 Next Priority Tasks
1. **Tool Call Message Linkage Implementation** - Complete all 11 tasks to link final response messages to their associated tool call/response messages
2. **Review and update test coverage for all new linkage logic** - Ensure comprehensive coverage of edge cases
3. **Ensure all documentation and memory bank files reflect the new linkage model and logic** - Update documentation to match implementation

### 🚀 Future Enhancement Tasks
1. **Tool Call Linkage for Direct Message Tools:** Handle tools like `diceTool`, `dallETool`, etc. that call `telegram.sendDice()`, `telegram.sendPhoto()` directly. These messages are stored but not linked back to originating tool calls, breaking LLM context.
2. **IntermediateAnswerTool Enhancement:** This tool sends messages directly AND its tool calls are filtered out from announcements, so tool calls are never persisted. Need solution to link tool-generated messages back to their originating tool calls.

## Current Status

**✅ MAJOR MILESTONE ACHIEVED:** Tool call and tool response persistence is now fully implemented and working. The LLM now has complete context of tool interactions in conversation history, significantly improving the quality of AI responses.

**Key Achievements:**
- Tool calls are properly persisted to database with JSON storage
- Tool responses are linked to their originating calls via ToolMessage table
- Message history includes both tool calls and responses in proper LangChain format
- All database queries are optimized with proper joins
- Type safety is maintained throughout the stack
- Comprehensive test coverage ensures reliability

**Technical Implementation:**
- Database schema supports tool persistence with proper relationships
- Repository layer handles data access with enhanced types
- Service layer manages business logic for tool call/response lifecycle
- Graph nodes handle persistence atomically during tool execution
- LangChain integration maintains proper message format for AI context

## Known Issues

None currently. All formatting, linting, building, and tests pass successfully.

## Evolution of Project Decisions

- **Persistence Strategy:** Evolved from immediate persistence to atomic persistence after tool execution for better consistency.
- **Type Safety:** Enhanced type system to explicitly show what database relations are included in each query.
- **Testing Approach:** Created comprehensive fakes to enable isolated unit testing of all components.
- **Graph Architecture:** Separated concerns between announcement (communication) and persistence (database) operations.
- Started as a personal fun project exploring AI and Telegram bots.
- Adopted Inversify for DI and Prisma for ORM to improve maintainability.
- Introduced Strategy and Factory patterns for extensible reply logic.
- Integrated LangChain, LangGraph, and hnswlib-node for advanced LLM workflows.
- Structured code into services, repositories, tools, and fakes to enforce separation of concerns. 
- **Implemented comprehensive tool call persistence:** Tool calls and responses are now atomically persisted with selective storage (only tool calls with responses), ensuring database consistency and improved LLM context reliability. 
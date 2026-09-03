# Tool-call lifecycle

The persisted conversation must reconstruct every completed tool interaction as a valid LangChain call/response sequence.

## Execution and storage

1. A model response containing tool calls enters the announcement node before any tool executes.
2. The node builds one ordinary announcement from the assistant content and tool calls, omitting `intermediate-answer` calls from the rendered text. When that leaves content and the sent message is stored, the node records its database ID with the original `AIMessage` and current call IDs.
3. After execution, persist only calls that have matching `ToolMessage` responses. Serialize those calls on the announcement `Message`; store each response as a linked `ToolMessage` record.
4. Accumulate every stored announcement-message ID across graph iterations.
5. Link the final assistant response to all accumulated announcement messages. History reconstruction expands those links chronologically into assistant calls followed by their tool responses.

An incomplete call/response pair must not enter reconstructed history. Persistence and final-response linkage are required parts of the response flow: failures propagate through the normal visible error path rather than silently leaving unreconstructable history.

These are ownership and ordering invariants. Keep concrete Prisma shapes and graph topology in their source files rather than duplicating them here.

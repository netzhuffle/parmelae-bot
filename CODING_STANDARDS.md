# Coding standards

Apply code rules to new and materially changed code; treat untouched legacy violations as migration debt. Read the tool sections when changing their construction, registration, execution, announcements, persistence, or history.

## Application boundaries

- Services own business logic. Repositories own persistence CRUD, queries, and mapping.
- Dependencies typed as interfaces remain narrow. When Inversify resolves such a dependency, supply an explicit runtime token such as `@inject(Config)` without widening the parameter type to the concrete class.
- Import generated Prisma models and enums from their direct model or enum files rather than barrel exports.

## Code organization

- Name service files `*Service.ts` and tool files `*Tool.ts` where those suffixes describe the exported role.
- Keep service-owned types in the service file.
- Use specific `Error` subclasses for distinct failure cases.
- Document public methods and exported classes with JSDoc.

## Tests and diagnostics

- Prefer simple fakes to mocks at external boundaries.
- Every handwritten lint suppression states why the suppressed behavior is required.

## LangChain tools

- Obtain tool dependencies through `ToolContext` and `getToolContext(config)`.
- Model-facing optional Zod fields use `.nullish()` rather than `.optional()` so models may supply either `null` or no value.
- Return readable tool results for recoverable user or domain failures. Let unexpected technical failures throw into the normal error-handling path.

## User-facing copy

- Use typographical apostrophes and quotation marks in user-facing text.

## Tool composition

Tools have three lifecycles. Choose the lifecycle before choosing where to register or construct a tool.

### Global tools

Global tools are available to every identity and reusable across messages. `ChatGptAgentService` owns their registration. Tools whose factories have no per-message input may be constructed once when that service is created.

### Identity tools

An `Identity` owns the tools available only to that identity. `ChatGptAgentService` merges them after global tools for each agent invocation.

Identity tools must be safe to reuse across calls and therefore cannot retain mutable invocation-specific state. They cannot shadow the reserved dynamic tool names `schedule-message` or `intermediate-answer`; conflicting identity tools are excluded.

### Per-message tools

Tools that capture message-specific values are constructed for each invocation in `ChatGptAgentService.buildTools`. Schedule and intermediate-answer tools are merged last so their captured chat, sender, and message context belongs to the current request.

When adding a tool, register it at the point matching its lifecycle. Do not move a tool to a broader lifecycle merely to make registration convenient.

## Tool-call history

The persisted conversation must reconstruct every completed tool interaction as a valid LangChain call/response sequence.

### Execution and storage

1. A model response containing tool calls enters the announcement node before any tool executes.
2. The node builds one ordinary announcement from the assistant content and tool calls, omitting `intermediate-answer` calls from the rendered text. When that leaves content and the sent message is stored, the node records its database ID with the original `AIMessage` and current call IDs.
3. After execution, persist only calls that have matching `ToolMessage` responses. Serialize those calls on the announcement `Message`; store each response as a linked `ToolMessage` record.
4. Accumulate every stored announcement-message ID across graph iterations.
5. Link the final assistant response to all accumulated announcement messages. History reconstruction expands those links chronologically into assistant calls followed by their tool responses.

An incomplete call/response pair must not enter reconstructed history. Persistence and final-response linkage are required parts of the response flow: failures propagate through the normal visible error path rather than silently leaving unreconstructable history.

These are ownership and ordering invariants. Keep concrete Prisma shapes and graph topology in their source files rather than duplicating them here.

## Completion and commits

- Run `bun run checks` before handing off implementation changes; completion means the command exits successfully.
- An internal-only commit message ends with a blank line followed by `no_announcement`. Without it, the bot announces the commit in Telegram on its next restart.
- Before requesting elevated permission to commit, show the exact commit message and state how many commits will be created.

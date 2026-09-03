# LangChain tool composition

Tools have three lifecycles. Choose the lifecycle before choosing where to register or construct a tool.

## Global tools

Global tools are available to every identity and reusable across messages. `ChatGptAgentService` owns their registration. Tools whose factories have no per-message input may be constructed once when that service is created.

## Identity tools

An `Identity` owns the tools available only to that identity. `ChatGptAgentService` merges them after global tools for each agent invocation.

Identity tools must be safe to reuse across calls and therefore cannot retain mutable invocation-specific state. They cannot shadow the reserved dynamic tool names `schedule-message` or `intermediate-answer`; conflicting identity tools are excluded.

## Per-message tools

Tools that capture message-specific values are constructed for each invocation in `ChatGptAgentService.buildTools`. Schedule and intermediate-answer tools are merged last so their captured chat, sender, and message context belongs to the current request.

When adding a tool, register it at the point matching its lifecycle. Do not move a tool to a broader lifecycle merely to make registration convenient.

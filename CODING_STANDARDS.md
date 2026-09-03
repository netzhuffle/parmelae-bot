# Coding standards

These standards apply to new and materially changed code. Untouched legacy violations are migration debt, not findings in an otherwise unrelated change.

## Application boundaries

- Services own business logic. Repositories own persistence CRUD, queries, and mapping.
- Dependencies typed as interfaces remain narrow. When Inversify resolves such a dependency, supply an explicit runtime token such as `@inject(Config)` without widening the parameter type to the concrete class.
- Import generated Prisma models and enums from their direct model or enum files rather than barrel exports.

## Tests and diagnostics

- Prefer simple fakes to mocks at external boundaries.
- Every handwritten lint suppression states why the suppressed behavior is required.

## LangChain tools

- Obtain tool dependencies through `ToolContext` and `getToolContext(config)`.
- Model-facing optional Zod fields use `.nullish()` rather than `.optional()` so models may supply either `null` or no value.
- Return readable tool results for recoverable user or domain failures. Let unexpected technical failures throw into the normal error-handling path.

## User-facing copy

- Use typographical apostrophes and quotation marks in user-facing text.

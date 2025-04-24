# System Patterns

## System Architecture
- Entry point `src/index.ts` loads the Inversify DI container with services, repositories, and tools
- `Bot` initializes Telegraf for Telegram updates and routes messages to handlers
- LangChain and LangGraph integrated via Tools for LLM pipelines
- Prisma connects to a local SQLite database for persistence
- Sentry provides optional error tracking when DSN is present

## Key Technical Decisions
- Use Inversify for dependency injection to decouple components and improve testability
- Employ Prisma ORM for database abstraction and migrations (SQLite for dev, SQL deploy in prod)
- Leverage Telegraf as the framework for Telegram bot interactions
- Integrate LangChain and OpenAI for AI-driven conversational responses
- Apply Strategy pattern for dynamic reply behaviors and Factory pattern for handler creation
- Utilize `hnswlib-node` for vector store management in embeddings

## Design Patterns
- Dependency Injection (Inversify) for component wiring
- Repository Pattern to encapsulate database CRUD operations
- Service Layer Pattern for business logic implementation
- Strategy Pattern to select different reply strategies at runtime
- Factory Pattern in `CallbackHandlerFactory` to instantiate handlers

## Component Relationships
- `Bot` depends on `CommandService`, `CallbackHandler`, and `ReplyStrategyFinder`
- Services (e.g., `ChatGptService`, `ScheduledMessageService`) depend on their corresponding Repositories for data access
- Tools under `/src/Tools` used by Services for AI/LLM integrations
- DI container configured in `inversify.config.ts` wires up all classes and constants

## Critical Implementation Paths
- Incoming Telegram message → `Bot` → `CallbackHandlerFactory` → `CallbackHandler` → `ReplyStrategyFinder` → Selected `ReplyStrategy` → Specific Service (e.g., `ChatGptService`) → Response → `Bot` sends reply
- Scheduled messages loaded by `ScheduledMessageService` from DB via `ScheduledMessageRepository`, then sent by `Bot` at the scheduled time
- Image generation via `DallEService` calls OpenAI API, then `Bot` sends the generated image 
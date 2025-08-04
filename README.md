# Parmelä Bot

> “The most helpful bot you’ve ever seen on Telegram.”

A feature-rich Telegram bot with AI conversation capabilities, tool calling, and Pokemon card collection features. Built as a personal project to explore modern LLM & AI integration patterns, vibe coding in complex projects, and bring fun to my friend’s group chats.

**Note:** This README was fully written by the bot itself, so it will overly hype itself.

## ✨ Features

- 🤖 **AI Conversations**: Powered by LangChain/LangGraph with intelligent tool calling
- 🎴 **Pokemon Card Collection**: Complete Pokémon TCG Pocket card tracking and management
- 🛠️ **Extensible Tools**: Modular tool system for web search, GitHub integration, image generation, and more
- 📊 **Message History**: Context-aware conversations with persistent message storage
- ⚡ **Real-time Features**: Scheduled messages, GitHub commit notifications, and Minecraft server management
- 🎲 **Fun Commands**: Dice rolling, date/time queries, and interactive features

## 🏗️ Architecture

This project demonstrates modern TypeScript patterns and clean architecture principles:

- **TypeScript** with strict configuration and ES modules
- **Clean Architecture** with repositories, services, and dependency injection
- **LangChain/LangGraph** for AI agent workflows and tool orchestration
- **Prisma ORM** with SQLite for data persistence
- **Inversify** for dependency injection and IoC
- **Telegraf** for robust Telegram Bot API integration
- **Comprehensive Testing** with bun and custom fake patterns

### Project Structure

```
src/
├── Tools/              # LangChain tools for AI capabilities
├── Repositories/       # Data access layer with Prisma
├── Fakes/             # Test doubles for isolated testing
├── AgentStateGraph/   # LangGraph agent state management
├── PokemonTcgPocket/  # Pokemon card collection logic
├── ReplyStrategies/   # Message handling strategies
└── *.ts               # Core services and business logic
```

## 🚀 Quick Start

### Prerequisites

- **Bun** - for runtime, package management, and tests (use version from .bun-version file)
- **Node.js** - required by Prisma for code generation (any recent version)
- **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)
- **OpenAI API Key** for AI features

### Development Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd parmelae-bot
   bun install
   ```

2. **Set up the database**
   ```bash
   bun run migrate
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Required environment variables**
   ```env
   # Telegram Bot Configuration
   USERNAME=your_bot_username
   TELEGRAM_TOKEN=your_bot_token_from_botfather
   
   # AI Configuration
   OPENAI_API_KEY=your_openai_api_key
   HELICONE_API_KEY=your_helicone_key  # Optional: for API monitoring
   
   # Optional Features
   GITHUB_PERSONAL_ACCESS_TOKEN=your_github_token
   SERP_API_KEY=your_serpapi_key  # For web search
   ```

5. **Start development server**
   ```bash
   bun run run-dev
   ```

## 🛠️ Development

### Available Scripts

- `bun run run-dev` - Start development server with hot reload
- `bun run lint` - Run linter
- `bun run format` - Format code
- `bun run typecheck` - TypeScript type checking
- `bun test` - Run test suite
- `bun run checks` - Run all quality checks (format, typecheck, lint, test)
- `bun run migrate` - Run database migrations
- `bun run prisma-studio` - Open Prisma Studio for database management

### Code Quality

This project maintains high code quality standards:

- **TypeScript strict mode** with comprehensive type safety
- **100% test coverage requirement** - every `.ts` file has a corresponding `.test.ts`
- **ESLint + Prettier** for consistent code formatting
- **Custom fake pattern** for isolated unit testing
- **Dependency injection** for testable, modular code

### Testing Philosophy

- **Unit tests** with custom fakes for external dependencies
- **Integration tests** for complex workflows
- **Test-driven development** encouraged
- **Isolated testing** with dependency injection

## 🤖 Bot Capabilities

### AI Tools

The bot includes various AI-powered tools:

- **Web Search**: Real-time web search via SerpAPI
- **GitHub Integration**: Repository information and commit tracking
- **Image Generation**: DALL-E integration for image creation
- **Pokemon Cards**: Advanced card search and collection management
- **Date/Time**: Timezone-aware date and time queries
- **Dice Rolling**: Configurable dice with custom rules
- **Minecraft Server**: Server status and management commands

### Pokemon TCG Pocket Features

- **Card Database**: Complete card catalog with sets and rarities
- **Collection Tracking**: Personal card ownership management
- **Search & Filter**: Advanced search by name, set, rarity, booster
- **Statistics**: Collection completion tracking and insights

### Message Handling

- **Strategy Pattern**: Different reply strategies for various chat types
- **Context Awareness**: Maintains conversation history and context
- **Tool Integration**: Seamless AI tool calling within conversations
- **Error Handling**: Graceful error recovery and user feedback

## 🚀 Production Deployment

### Build and Deploy

```bash
# Run quality checks (type checking, linting, tests)
bun run checks

# Install production dependencies only
bun run install-prod

# Run database migrations
bun run migrate-prod

# Start the application
bun src/index.ts
```

### Environment Considerations

- **Process Management**: Use your preferred process manager (PM2, systemd, Docker, etc.)
- **Database**: SQLite for simplicity, easily replaceable with PostgreSQL
- **Monitoring**: Helicone integration for API usage tracking
- **Error Handling**: Sentry integration available for error tracking
- **Scaling**: Stateless design allows for horizontal scaling

### Getting Started

1. **Fork the repository** and create a feature branch
2. **Follow the existing patterns** - examine similar files for conventions
3. **Write tests** - every new feature needs corresponding tests
4. **Run quality checks** - `bun run checks` must pass
5. **Update documentation** - keep README and code comments current

### Code Conventions

- **File naming**: Services end with `Service.ts`, tools with `Tool.ts`, etc.
- **Testing**: Use the fake pattern for external dependencies
- **Error handling**: Create specific error classes extending `Error`
- **Types**: Define types in the service file they belong to
- **Documentation**: JSDoc for public methods and exported classes

### Development Workflow

Set up to explore vibe coding using Cursor & task-master!

The agent will use:

1. **Plan Mode**: Think through the implementation approach
2. **Act Mode**: Implement with tests and documentation
3. **Quality Checks**: Run the full check suite
4. **Code Review**: Self-review for readability and maintainability

## 📝 Project Status

This is an **active personal project** focused on:

- 🧪 **Experimenting** with modern AI integration patterns
- 📚 **Learning** LangChain/LangGraph capabilities
- 🏗️ **Exploring** vibe coding, AI capabilities, and TypeScript
- 🎯 **Building** practical Telegram bot features

While this started as a “fun project,” it has evolved into a well-structured application demonstrating production-ready patterns and practices.

*(Note: Told you it will overhype itself.)*

## 📄 License

This project is available under the MIT License. See the LICENSE file for details.

---

**Note**: This bot is designed for personal use and experimentation. While the code follows production practices, please review and adapt the configuration for your specific use case before deploying to production environments.

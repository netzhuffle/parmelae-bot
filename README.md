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

   ```fish
   git clone <repository-url>
   cd parmelae-bot
   bun install
   ```

2. **Set up the database**

   ```fish
   bun run migrate
   ```

3. **Configure environment**

   ```fish
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
   ```fish
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
- **Oxlint + oxfmt** for linting and consistent code formatting
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

Production uses GitHub Actions plus a release-based server layout:

```text
/srv/parmelae-bot/
├── current -> /srv/parmelae-bot/releases/<git-sha>
├── releases/
└── shared/
    ├── .env
    ├── sqlite.db
    └── backups/
```

The bot runs as a compiled Bun executable under `systemd`. Releases are synced to
`releases/<git-sha>`, `current` is updated on successful activation, and the shared
SQLite database plus backups stay outside the release directories. The server does
not need Bun for runtime or activation; Bun is only used in CI to build the executable.

### One-time Server Setup

1. Create a dedicated runtime Linux user, for example `parmelae-bot`.
2. Create a separate deployment Linux user, for example `deploy-parmelae-bot`.
3. Create `/srv/parmelae-bot/releases` and `/srv/parmelae-bot/shared/backups`.
4. Copy the production `.env` to `/srv/parmelae-bot/shared/.env`.
5. Copy the production SQLite database to `/srv/parmelae-bot/shared/sqlite.db`.
6. Add production path overrides to `/srv/parmelae-bot/shared/.env`:

```env
DATABASE_URL="file:/srv/parmelae-bot/shared/sqlite.db"
BACKUP_DIR="/srv/parmelae-bot/shared/backups"
```

7. Install the systemd unit from `deploy/systemd/parmelae-bot.service`.
8. Grant the deployment user permission to run `systemctl` and `journalctl` for `parmelae-bot` without a password.

### Deployment Flow

Each push to `main` runs:

```fish
bun install --frozen-lockfile
bunx prisma generate
bun run checks
bun run build:executable
```

If CI passes, GitHub Actions uploads a release bundle, syncs it to the server, and runs
`deploy/activate-release.sh`, which:

1. verifies the compiled executable and server CPU support
2. backs up the shared SQLite database through the compiled executable
3. applies pending Prisma SQLite migrations through the compiled executable
4. updates the `current` symlink
5. restarts the systemd service
6. prunes old backups and releases

### systemd Commands

```fish
sudo systemctl status parmelae-bot
sudo systemctl restart parmelae-bot
sudo systemctl stop parmelae-bot
journalctl -u parmelae-bot -n 100 --no-pager
```

### Important Notes

- The runtime service starts `/srv/parmelae-bot/current/parmelae-bot`.
- The executable is built for `bun-linux-x64-modern`; the server CPU must support AVX2.
- Deployment activation does not require Bun or `node_modules` on the server.
- The production database is configured through `DATABASE_URL`.
- Backups are configured through `BACKUP_DIR`.
- The Minecraft server name defaults to `atm8` and can be changed through `MINECRAFT_SERVER_NAME`.
- Code rollback does not automatically roll back database schema changes; keep the pre-deploy SQLite backups.

### Environment Considerations

- **Process Management**: systemd service in `deploy/systemd/parmelae-bot.service`
- **Runtime Artifact**: compiled Bun executable at `/srv/parmelae-bot/current/parmelae-bot`
- **Database**: SQLite stored in `/srv/parmelae-bot/shared/sqlite.db`
- **Monitoring**: Helicone integration for API usage tracking
- **Error Handling**: Sentry integration available for error tracking
- **Scaling**: Stateless services can scale, but the shared SQLite database is still single-host

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

- Prefer small, focused changes.
- Run `bun run checks` before merging.
- Keep tests and documentation aligned with behavior changes.

## 📝 Project Status

This is an **active personal project** focused on:

- 🧪 **Experimenting** with modern AI integration patterns
- 📚 **Learning** LangChain/LangGraph capabilities
- 🏗️ **Exploring** vibe coding, AI capabilities, and TypeScript
- 🎯 **Building** practical Telegram bot features

While this started as a “fun project,” it has evolved into a well-structured application demonstrating production-ready patterns and practices.

_(Note: Told you it will overhype itself.)_

## 📄 License

This project is available under the MIT License. See the LICENSE file for details.

---

**Note**: This bot is designed for personal use and experimentation. While the code follows production practices, please review and adapt the configuration for your specific use case before deploying to production environments.

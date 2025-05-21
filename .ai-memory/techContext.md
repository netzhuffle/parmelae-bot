# Technical Context

## Technologies in Use
- Node.js
- TypeScript
- Prisma
- LangChain
- LangGraph
- Telegraf
- Inversify

## Development Setup
- npm scripts for formatting, building, linting, testing

## Technical Constraints
- Node.js (>=22.0.0) with ESM modules (type: module)
- SQLite3 for development, managed via Prisma migrations
- Strict TypeScript settings in tsconfig.json (noImplicitAny, strictNullChecks)
- Required environment variables loaded via dotenv and validated at startup
- CI checks enforce formatting, linting, schema formatting, and tests
- Use of Prisma JSON field (toolCalls) and ToolMessage table for tool call and response persistence.

## Dependencies
- AI/LLM: @langchain/core, @langchain/community, @langchain/langgraph, openai
- Database: @prisma/client, sqlite3, prisma
- Bot: telegraf
- DI: inversify, reflect-metadata, inversify-inject-decorators
- Utilities: axios, cheerio, puppeteer, zod, js-yaml, yaml-validator
- Vector Store: hnswlib-node
- Monitoring: @sentry/node

## Tool Usage Patterns
- Formatting: npm script `format` (Prettier)
- Schema formatting: npm script `schema-format` (Prisma)
- Building: npm script `build` (TypeScript compiler)
- Linting: npm script `lint` (ESLint) and `validate-yaml` (YAML validator)
- Testing: npm script `test` (Jest with ts-jest)
- Migrations: npm scripts `migrate` (development) and `migrate-prod` (production) 
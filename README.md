# Parmelä Bot

“The most helpful bot you’ve ever seen on Telegram.”

This is a personal fun project to try various AI and Telegram bot things.

It is not set up for general usage and breaks most software development practices for good code.

Test coverage is terrible, but I do have lots of fun trying out new things here and there.

# Prepare for development

1. Install/update [node.js](https://nodejs.org/), LTS recommended.
2. Run `npm install` to install dependencies.
3. Run `npx prisma migrate dev` to create the local sqlite3 database.
4. Copy `.env.example` to `.env`.
5. Fill in the required data into `.env`:
   1. Register a telegram bot with [@BotFather](https://t.me/BotFather) and fill in `USERNAME` and the `TELEGRAM_TOKEN`
      given from @BotFather.
   2. Create an account for the [OpenAI API](https://openai.com/api/) and fill in the `OPENAI_API_KEY`.
   3. Other config options as wanted.

# Run in development

1. Update dependencies: `npm install`
2. Run new database migrations: `npm run migrate`
3. Execute: `npm run run-dev`

# Run in production

1. Update dependencies: `npm install`
2. Build: `npm run build`
3. Remove dev dependencies: `npm install --omit=dev`
4. Deploy (however you like)
5. Run database migrations: `npm run migrate-prod`
6. Execute: `node dist/index.js`

# Parmelä Bot

The most helpful bot you’ve ever seen on Telegram.

# Prepare for development

1. Install/update [node.js](https://nodejs.org/), LTS recommended.
2. Run `npm install` to install dependencies.
3. Run `npx prisma migrate dev` to create the local sqlite3 database.
4. Copy `config.example.ts` to `config.ts`.
5. Fill in the required data into `config.ts`:
    1. Register a telegram bot with [@BotFather](https://t.me/BotFather) and fill in `username` and the `telegramToken`
       given from @BotFather.
    2. Create an app at [wit.ai](https://wi.ai) fill in the `witToken`.
    3. Create an account for the [OpenAI API](https://openai.com/api/) and fill in the `openAiKey`.
    4. Other config options as wanted.
6. Create sentences on wit.ai for the following intents:
    * `info`
    * `comment`
    * `complete`
7. Optional: If you want to use the [mscs](https://minecraftservercontrol.github.io/docs/mscs) scripts, give +x to the
   scripts in `cmd/` and add sentences on wit.ai for the following intents:
    * `startminecraft`
    * `stopminecraft`
    * `statusminecraft`
    * `backupminecraft`

# Run in development

1. Update dependencies: `npm install`
2. Run new database migrations: `npx prisma migrate dev`
3. Execute: `npx ts-node src/index.ts`

# Run in production

1. Update dependencies: `npm install`
2. Run new database migrations: `npx prisma migrate dev`
3. Compile: `npx tsc`
4. Remove dev dependencies: `npm install --omit=dev`
5. Deploy (however you like)
6. Execute: `node built/src/index.js`

# Parmelä Bot

The most helpful bot you’ve ever seen on Telegram.

# Prepare for development

* Install/update [node.js](https://nodejs.org/), LTS recommended.
* Run `npm install` to install dependencies.
* Copy `config.example.ts` to `config.ts`.
* Fill in the required data into `config.ts`:
    * Register a telegram bot with [@BotFather](https://t.me/BotFather) and fill in `username` and the `telegramToken`
      given from @BotFather.
    * Create an app at [wit.ai](https://wi.ai) fill in the `witToken`.
    * Create an account for the [OpenAI API](https://openai.com/api/) and fill in the `openAiKey`.
* Create sentences on wit.ai for the following intents:
    * `info`
    * `comment`
    * `complete`
* Optional: If you want to use the [mscs](https://minecraftservercontrol.github.io/docs/mscs) scripts, give +x to the
  scripts in `cmd/` and add sentences on wit.ai for the following intents:
    * `startminecraft`
    * `stopminecraft`
    * `statusminecraft`
    * `backupminecraft`

# Run in development

* Update dependencies: `npm install`
* Execute: `npx ts-node src/index.ts`

# Run in production

* Update dependencies: `npm install --production`
* Compile: `npx tsc`
* Deploy (however you like)
* Execute: `node built/src/index.js`

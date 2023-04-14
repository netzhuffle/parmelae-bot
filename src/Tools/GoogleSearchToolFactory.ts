import { singleton } from "tsyringe";
import { SerpAPI } from "langchain/tools";
import { Config } from "../Config";

@singleton()
export class GoogleSearchToolFactory {
    constructor(
        private readonly config: Config,
    ) { }

    create(): SerpAPI {
        return new SerpAPI(
            this.config.serpApiApiKey, {
            location: 'Bern,Canton of Bern,Switzerland',
            hl: 'de',
            gl: 'ch',
        });
    }
}

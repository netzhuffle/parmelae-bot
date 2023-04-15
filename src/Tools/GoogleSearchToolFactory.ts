import { injectable } from "inversify";
import { SerpAPI } from "langchain/tools";
import { Config } from "../Config";

@injectable()
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

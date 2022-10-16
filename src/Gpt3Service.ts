import {OpenAIApi} from "openai";
import {singleton} from "tsyringe";
import {Gpt3Temperature} from "./Gpt3Temperature";

/** Maximum number of tokens to generate by GPT-3. */
const MAX_TOKENS = 256;

/** The most capable, expensive GPT-3 text completion model. */
const LARGEST_MODEL = 'text-davinci-002';

/** GPT-3 Service */
@singleton()
export class Gpt3Service {
    /** Maximum number of characters in input text to avoid high cost. */
    static readonly MAX_INPUT_TEXT_LENGTH = 800;

    constructor(
        private readonly openAi: OpenAIApi,
    ) {
    }

    /**
     * Generates a completion string if possible and returns it if it is not empty or whitespace.
     * @param prompt - The GPT-3 completion prompt
     * @param stopStrings - String or strings where GPT-3 should stop the generation and not include them
     * @param temperature - General GPT-3 generation temperature (0–1) if not default. 0 = 0% creativity, 1 = 100% freedom.
     */
    async generateCompletion(
        prompt: string,
        stopStrings: string | string[],
        temperature: Gpt3Temperature = Gpt3Temperature.Default,
    ): Promise<string | null> {
        const response = await this.openAi.createCompletion({
            model: LARGEST_MODEL,
            prompt,
            stop: stopStrings,
            max_tokens: MAX_TOKENS,
            temperature,
        });
        const completion = response.data.choices?.[0].text;
        if (completion?.trim()) {
            return completion;
        }

        return null;
    }
}

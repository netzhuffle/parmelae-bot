import {ChatCompletionRequestMessage, ChatCompletionResponseMessage, OpenAIApi} from "openai";
import {singleton} from "tsyringe";

/** The ChatGPT model to use. */
const MODEL = 'gpt-3.5-turbo';

/** ChatGPT Service */
@singleton()
export class ChatGptService {
    /** Maximum number of characters in input text to avoid high cost. */
    static readonly MAX_INPUT_TEXT_LENGTH = 1200;

    constructor(
        private readonly openAi: OpenAIApi,
    ) {
    }

    /**
     * Generates a completion message if possible and returns it.
     */
    async generateCompletion(
        messages: ChatCompletionRequestMessage[],
    ): Promise<ChatCompletionResponseMessage | null> {
        try {
            const response = await this.openAi.createChatCompletion({
                model: MODEL,
                messages,
            });
            return response.data.choices?.[0].message ?? null;
        } catch (e) {
            if (e instanceof Error && e.message.startsWith('connect ECONNREFUSED')) {
                return null;
            }
            throw e;
        }
    }
}

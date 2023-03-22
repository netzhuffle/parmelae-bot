import {singleton} from "tsyringe";
import {ChatGptService} from "../ChatGptService";
import {ChatGptMessage, ChatGptRoles} from "./ChatGptMessage";

/** Creates Dall-E prompts. */
@singleton()
export class DallEPromptGenerator {
    constructor(private readonly chatGpt: ChatGptService) {
    }

    /**
     * Asks GPT to generate a DALL-E prompt.
     * @param text - The text about what’s asked.
     * @return The prompt.
     */
    async generate(text: string): Promise<string> {
        const messages: ChatGptMessage[] = [
            {
                role: ChatGptRoles.System,
                content: 'Generiere einen Dall-E-Prompt für wunderschöne Kunst oder Fotos basierend auf einer simplen Anfrage. Dall-E-Prompts sind englisch, übertrieben detailliert beschrieben, mit hohen Qualitätsforderungen, jedoch nah an der ursprünglichen Anfrage.',
            },
            {
                role: ChatGptRoles.User,
                content: 'Malen Sie einen Hamster.',
            },
            {
                role: ChatGptRoles.Assistant,
                content: 'Drawing of a hamster, high quality, professional drawing, highly detailed epic, trending on art station.',
            },
            {
                role: ChatGptRoles.User,
                content: 'Ein Foto der Golden Gate Bridge, bitte.',
            },
            {
                role: ChatGptRoles.Assistant,
                content: 'Photo of the Golden Gate Bridge, in 4k high resolution, professional photo for magazine, 35mm camera 3.4f, hyper detailed.',
            },
            {
                role: ChatGptRoles.User,
                content: text,
            }
        ];

        const completion = await this.chatGpt.generateCompletion(messages);
        return completion ? completion.content : `Oh nein, ich bedaure: Meine Kamera ist kaputt, ich kann das echte Bild gerade nicht senden.`;
    }
}

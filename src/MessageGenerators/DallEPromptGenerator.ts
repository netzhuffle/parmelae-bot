import {singleton} from "tsyringe";
import {Gpt3Service} from "../Gpt3Service";

/** Creates Dall-E prompts. */
@singleton()
export class DallEPromptGenerator {
    constructor(private readonly gpt3: Gpt3Service) {
    }

    /**
     * Asks GPT-3 to generate a GPT-3 prompt.
     * @param text - The text about what’s asked.
     * @return The prompt.
     */
    async generate(text: string): Promise<string> {
        const prompt = `Generiere einen Dall-E-Prompt für wunderschöne Kunst oder Fotos basierend auf einer simplen Anfrage. Dall-E-Prompts sind englisch, übertrieben detailliert beschrieben, mit hohen Qualitätsforderungen, jedoch nah an der ursprünglichen Anfrage.

Anfrage: Malen Sie einen Hamster.
Prompt: Drawing of a hamster, high quality, professional drawing, highly detailed epic, trending on art station.

Anfrage: Ein Foto der Golden Gate Bridge, bitte.
Prompt: Photo of the Golden Gate Bridge, in 4k high resolution, professional photo for magazine, 35mm camera 3.4f, hyper detailed.

Anfrage: ${text}
Prompt:`;

        const completion = await this.gpt3.generateCompletion(prompt, ['Anfrage:', 'Prompt:', '\n']);
        const message = completion?.trim();
        return message !== undefined ? message : `Oh nein, ich bedaure: Meine Kamera ist kaputt, ich kann das Bild gerade nicht senden.`;
    }
}
import {
    AIMessagePromptTemplate,
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    SystemMessagePromptTemplate
} from "langchain/prompts";
import {singleton} from "tsyringe";
import {ChatGptService} from "../ChatGptService";
import {ChatGptModels} from "../ChatGptModelsProvider";

const PROMPT = ChatPromptTemplate.fromPromptMessages([
    SystemMessagePromptTemplate.fromTemplate('Generiere einen Dall-E-Prompt für wunderschöne Kunst oder Fotos basierend auf einer simplen Anfrage. Dall-E-Prompts sind englisch, übertrieben detailliert beschrieben, mit hohen Qualitätsforderungen, jedoch nah an der ursprünglichen Anfrage.'),
    HumanMessagePromptTemplate.fromTemplate('Malen Sie einen Hamster.'),
    AIMessagePromptTemplate.fromTemplate('Drawing of a hamster, high quality, professional drawing, highly detailed epic, trending on art station.'),
    HumanMessagePromptTemplate.fromTemplate('Ein Foto der Golden Gate Bridge, bitte.'),
    AIMessagePromptTemplate.fromTemplate('Photo of the Golden Gate Bridge, in 4k high resolution, professional photo for magazine, 35mm camera 3.4f, hyper detailed.'),
    HumanMessagePromptTemplate.fromTemplate('{description}'),
]);

/** Creates Dall-E prompts. */
@singleton()
export class DallEPromptGenerator {
    constructor(private readonly chatGpt: ChatGptService) {
    }

    /**
     * Generates a DALL-E prompt.
     * @param description - The image description.
     * @return The prompt.
     */
    async generate(description: string): Promise<string> {
        const message = await this.chatGpt.generate(PROMPT, ChatGptModels.ChatGpt, {
            description,
        });
        return message.content;
    }
}

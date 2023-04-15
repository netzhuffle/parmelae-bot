import {OpenAIApi} from "openai";
import {injectable} from "inversify";

/**
 * Image size string.
 *
 * Must be an allowed value from {@link https://beta.openai.com/docs/api-reference/images/create#images/create-size}.
 */
const SIZE = '1024x1024';

/** Integer to create just one image. */
const ONE_IMAGE = 1;

/** DALL·E Service */
@injectable()
export class DallEService {
    constructor(private readonly openAi: OpenAIApi) {
    }

    /**
    * Generates an image.
    * @param prompt - The DALL·E prompt
    * @return The URL to the image
    */
    async generateImage(prompt: string): Promise<string | null> {
        try {
            const response = await this.openAi.createImage({
                prompt,
                n: ONE_IMAGE,
                size: SIZE,
            });
            return response.data.data[0].url ?? null;
        } catch (e) {
            if (e instanceof Error && e.message.startsWith('connect ECONNREFUSED')) {
                return null;
            }
            throw e;
        }
    }
}

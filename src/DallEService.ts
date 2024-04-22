import { OpenAI } from 'openai';
import { injectable } from 'inversify';

/**
 * Image size string.
 *
 * Must be an allowed value from {@link https://platform.openai.com/docs/api-reference/images/create#images-create-size}.
 */
const SIZE = '1024x1024';

/**
 * Image quality string.
 *
 * Must be an allowed value from {@link https://platform.openai.com/docs/api-reference/images/create#images-create-quality}.
 */
const QUALITY = 'hd';

/** DALL·E Service */
@injectable()
export class DallEService {
  constructor(private readonly openAi: OpenAI) {}

  /**
   * Generates an image.
   * @param prompt - The DALL·E prompt
   * @return The URL to the image
   */
  async generateImage(prompt: string): Promise<string | null> {
    try {
      const response = await this.openAi.images.generate({
        model: 'dall-e-3',
        prompt,
        size: SIZE,
        quality: QUALITY,
      });
      return response.data[0].url ?? null;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith('connect ECONNREFUSED')) {
        return null;
      }
      throw e;
    }
  }
}

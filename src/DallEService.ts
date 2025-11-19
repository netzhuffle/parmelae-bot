import { DallEAPIWrapper } from '@langchain/openai';
import { injectable } from 'inversify';

/** DALL·E Service */
@injectable()
export class DallEService {
  constructor(private readonly dallEApiWrapper: DallEAPIWrapper) {}

  /**
   * Generates an image.
   * @param prompt - The DALL·E prompt
   * @return The URL to the image
   */
  async generateImage(prompt: string): Promise<string | null> {
    const imageUrl = (await this.dallEApiWrapper.invoke(prompt)) as unknown;
    if (!this.isString(imageUrl)) {
      return null;
    }
    return imageUrl;
  }

  private isString(value: unknown): value is string {
    return typeof value === 'string';
  }
}

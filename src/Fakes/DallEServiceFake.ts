import { DallEService } from '../DallEService.js';
import { OpenAI } from 'openai';

export class DallEServiceFake extends DallEService {
  request?: { prompt: string };
  result?: { url: string | null };

  constructor() {
    super(undefined as unknown as OpenAI);
  }

  async generateImage(prompt: string): Promise<string | null> {
    this.request = { prompt };
    return Promise.resolve(this.result?.url ?? null);
  }
}

import { injectable } from 'inversify';
import { Config } from '../Config';
import { SerpAPI } from './SerpAPI';

@injectable()
export class GoogleSearchToolFactory {
  constructor(private readonly config: Config) {}

  create(): SerpAPI {
    return new SerpAPI(this.config.serpApiApiKey, {
      location: 'Bern,Canton of Bern,Switzerland',
      hl: 'de',
      gl: 'ch',
    });
  }
}

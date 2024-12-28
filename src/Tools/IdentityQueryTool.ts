import { Tool } from '@langchain/core/tools';
import { Config } from '../Config.js';
import { SchiParmelaeIdentity } from '../MessageGenerators/Identities/SchiParmelaeIdentity.js';

export class IdentityQueryTool extends Tool {
  name = 'identity-query';

  description =
    'Use to find out which bot identity is used for the prompt. Returns the name of the used identity, by example Schi Parmelä or Emulator. Input should be an empty string.';

  constructor(
    private readonly chatId: bigint,
    private readonly config: Config,
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
  ) {
    super();
  }

  protected _call(): Promise<string> {
    const identity =
      this.config.identityByChatId.get(this.chatId)?.name ??
      this.schiParmelaeIdentity.name;

    return Promise.resolve(identity);
  }
}

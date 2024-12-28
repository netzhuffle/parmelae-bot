import { Config } from '../Config.js';
import { Tool } from '@langchain/core/tools';
import { SchiParmelaeIdentity } from '../MessageGenerators/Identities/SchiParmelaeIdentity.js';
import { EmulatorIdentity } from '../MessageGenerators/Identities/EmulatorIdentity.js';

export class IdentitySetterTool extends Tool {
  name = 'identity-set';

  description =
    'Use set which GPT language model should be used. Input should be "Schi Parmelä" or "Emulator".';

  constructor(
    private readonly chatId: bigint,
    private readonly config: Config,
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
    private readonly emulatorIdentity: EmulatorIdentity,
  ) {
    super();
  }

  protected _call(arg: string): Promise<string> {
    const identity = arg.trim();
    switch (identity) {
      case this.schiParmelaeIdentity.name:
        this.config.identityByChatId.set(
          this.chatId,
          this.schiParmelaeIdentity,
        );
        break;
      case this.emulatorIdentity.name:
        this.config.identityByChatId.set(this.chatId, this.emulatorIdentity);
        break;
      default:
        return Promise.resolve(
          `Error: Unknown identity. Use "${this.schiParmelaeIdentity.name}" or "${this.emulatorIdentity.name}".`,
        );
    }

    return Promise.resolve(`Success: ${identity} will be used from now on.`);
  }
}

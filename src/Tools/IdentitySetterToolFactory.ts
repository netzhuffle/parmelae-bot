import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { IdentitySetterTool } from './IdentitySetterTool.js';
import { SchiParmelaeIdentity } from '../MessageGenerators/Identities/SchiParmelaeIdentity.js';
import { EmulatorIdentity } from '../MessageGenerators/Identities/EmulatorIdentity.js';

@injectable()
export class IdentitySetterToolFactory {
  constructor(
    private readonly config: Config,
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
    private readonly emulatorIdentity: EmulatorIdentity,
  ) {}

  create(chatId: bigint): IdentitySetterTool {
    return new IdentitySetterTool(
      chatId,
      this.config,
      this.schiParmelaeIdentity,
      this.emulatorIdentity,
    );
  }
}

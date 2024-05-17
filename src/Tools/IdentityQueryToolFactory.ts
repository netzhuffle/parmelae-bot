import { injectable } from 'inversify';
import { Config } from '../Config.js';
import { IdentityQueryTool } from './IdentityQueryTool.js';
import { SchiParmelaeIdentity } from '../MessageGenerators/Identities/SchiParmelaeIdentity.js';

@injectable()
export class IdentityQueryToolFactory {
  constructor(
    private readonly config: Config,
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
  ) {}

  create(chatId: bigint): IdentityQueryTool {
    return new IdentityQueryTool(
      chatId,
      this.config,
      this.schiParmelaeIdentity,
    );
  }
}

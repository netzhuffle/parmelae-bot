import { injectable } from 'inversify';

/** Cache for Pokemon TCG Pocket database entity IDs */
@injectable()
export class PokemonTcgPocketEntityCache {
  private readonly setIds = new Map<string, number>();
  private readonly boosterIds = new Map<string, number>();

  getSetId(key: string): number | null {
    return this.setIds.get(key) ?? null;
  }

  getBoosterId(setKey: string, boosterName: string): number | null {
    return this.boosterIds.get(this.getBoosterKey(setKey, boosterName)) ?? null;
  }

  setSetId(key: string, id: number): void {
    this.setIds.set(key, id);
  }

  setBoosterId(setKey: string, boosterName: string, id: number): void {
    this.boosterIds.set(this.getBoosterKey(setKey, boosterName), id);
  }

  private getBoosterKey(setKey: string, boosterName: string): string {
    return `${setKey}:${boosterName}`;
  }
}

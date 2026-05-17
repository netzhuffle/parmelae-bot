import { Rarity } from '../../generated/prisma/enums.js';
import { BabyAsPotentialSixthCardStrategy } from '../PackProbabilityStrategies/BabyAsPotentialSixthCardStrategy.js';
import { FiveCardsStrategy } from '../PackProbabilityStrategies/FiveCardsStrategy.js';
import { FiveCardsWithoutShinyStrategy } from '../PackProbabilityStrategies/FiveCardsWithoutShinyStrategy.js';
import { FourCardGuaranteedExStrategy } from '../PackProbabilityStrategies/FourCardGuaranteedExStrategy.js';
import { ShinyAsPotentialSixthCardStrategy } from '../PackProbabilityStrategies/ShinyAsPotentialSixthCardStrategy.js';
import { PokemonTcgPocketProbabilityService } from '../PokemonTcgPocketProbabilityService.js';
import { PokemonTcgPocketProbabilityRepository } from '../Repositories/PokemonTcgPocketProbabilityRepository.js';

/** Fake probability repository for testing */
export class PokemonTcgPocketProbabilityRepositoryFake {
  private countsByRarity = new Map<string, number>();
  private countsIncludingSixPackOnly = new Map<Rarity, number>();
  public countGodPackEligibleByBoosterReturnValue = 0;

  /** Set count for a specific rarity and isSixPackOnly combination (for testing) */
  setCountByRarity(rarity: Rarity, isSixPackOnly: boolean, count: number): void {
    const key = `${rarity}_${isSixPackOnly}`;
    this.countsByRarity.set(key, count);
  }

  /** Set count for a rarity including six-pack-only cards (for testing) */
  setCountIncludingSixPackOnly(rarity: Rarity, count: number): void {
    this.countsIncludingSixPackOnly.set(rarity, count);
  }

  async countByBoosterRarityFilteringSixPackFlag(
    _boosterId: number,
    rarity: Rarity,
    isSixPackOnly: boolean,
  ): Promise<number> {
    const key = `${rarity}_${isSixPackOnly}`;
    return Promise.resolve(this.countsByRarity.get(key) ?? 0);
  }

  async countByBoosterRarity(_boosterId: number, rarity: Rarity): Promise<number> {
    return Promise.resolve(this.countsIncludingSixPackOnly.get(rarity) ?? 0);
  }

  async countGodPackEligibleByBooster(
    _boosterId: number,
    _godPackRarities: ReadonlySet<Rarity>,
  ): Promise<number> {
    return Promise.resolve(this.countGodPackEligibleByBoosterReturnValue);
  }

  reset(): void {
    this.countsByRarity.clear();
    this.countsIncludingSixPackOnly.clear();
    this.countGodPackEligibleByBoosterReturnValue = 0;
  }
}

/** Creates a probability service wired to fake strategies and repository data. */
export function createPokemonTcgPocketProbabilityServiceFake(
  repository = new PokemonTcgPocketProbabilityRepositoryFake(),
): PokemonTcgPocketProbabilityService {
  return new PokemonTcgPocketProbabilityService(
    new FiveCardsWithoutShinyStrategy(),
    new FiveCardsStrategy(),
    new BabyAsPotentialSixthCardStrategy(),
    new FourCardGuaranteedExStrategy(),
    new ShinyAsPotentialSixthCardStrategy(),
    repository as unknown as PokemonTcgPocketProbabilityRepository,
  );
}

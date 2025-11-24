/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import {
  PokemonCardDefaultArgs,
  PokemonCardGetPayload,
} from '../../generated/prisma/models/PokemonCard.js';

/** Type value for a Pokemon card including set, boosters, and ownership relations. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const POKEMON_CARD_WITH_RELATIONS = {
  include: {
    set: true,
    boosters: true,
    ownership: {
      include: {
        user: true,
      },
    },
  },
} satisfies PokemonCardDefaultArgs;

/** Pokemon card including set, boosters, and ownership relations. */
export type PokemonCardWithRelations = PokemonCardGetPayload<
  typeof POKEMON_CARD_WITH_RELATIONS
>;

/**
 * File for custom types used in repository signatures.
 *
 * While Prisma creates and exports most types, some need to be created manually.
 * See https://www.prisma.io/docs/concepts/components/prisma-client/advanced-type-safety/operating-against-partial-structures-of-model-types#problem-using-variations-of-the-generated-model-type.
 */

import { Prisma } from '@prisma/client';

/* eslint-disable @typescript-eslint/no-unused-vars */

/** Type value for a Pokemon card including set, boosters, and ownership relations. */
const POKEMON_CARD_WITH_RELATIONS =
  Prisma.validator<Prisma.PokemonCardDefaultArgs>()({
    include: {
      set: true,
      boosters: true,
      ownership: {
        include: {
          user: true,
        },
      },
    },
  });

/** Pokemon card including set, boosters, and ownership relations. */
export type PokemonCardWithRelations = Prisma.PokemonCardGetPayload<
  typeof POKEMON_CARD_WITH_RELATIONS
>;



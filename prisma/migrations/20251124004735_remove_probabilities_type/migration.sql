-- DropIndex
DROP INDEX IF EXISTS "PokemonBooster_probabilitiesType_idx";

-- DropIndex
DROP INDEX IF EXISTS "PokemonBooster_setId_probabilitiesType_idx";

-- AlterTable
ALTER TABLE "PokemonBooster" DROP COLUMN "probabilitiesType";


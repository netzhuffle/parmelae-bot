/*
  Warnings:

  - You are about to drop the column `hasShinyRarity` on the `PokemonBooster` table. All the data in the column will be lost.
  - You are about to drop the column `hasSixPacks` on the `PokemonBooster` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokemonBooster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "probabilitiesType" TEXT NOT NULL DEFAULT 'NO_SHINY_RARITY',
    CONSTRAINT "PokemonBooster_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PokemonBooster" ("id", "name", "probabilitiesType", "setId") SELECT "id", "name", "probabilitiesType", "setId" FROM "PokemonBooster";
DROP TABLE "PokemonBooster";
ALTER TABLE "new_PokemonBooster" RENAME TO "PokemonBooster";
CREATE INDEX "PokemonBooster_setId_idx" ON "PokemonBooster"("setId");
CREATE INDEX "PokemonBooster_probabilitiesType_idx" ON "PokemonBooster"("probabilitiesType");
CREATE INDEX "PokemonBooster_setId_probabilitiesType_idx" ON "PokemonBooster"("setId", "probabilitiesType");
CREATE UNIQUE INDEX "PokemonBooster_setId_name_key" ON "PokemonBooster"("setId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

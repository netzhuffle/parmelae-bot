-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokemonBooster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "hasShinyRarity" BOOLEAN NOT NULL DEFAULT false,
    "hasSixPacks" BOOLEAN NOT NULL DEFAULT false,
    "probabilitiesType" TEXT NOT NULL DEFAULT 'NO_SHINY_RARITY',
    CONSTRAINT "PokemonBooster_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PokemonBooster" ("hasShinyRarity", "hasSixPacks", "id", "name", "setId", "probabilitiesType") 
SELECT 
  "hasShinyRarity", 
  "hasSixPacks", 
  "id", 
  "name", 
  "setId",
  CASE 
    WHEN "hasShinyRarity" = 0 AND "hasSixPacks" = 0 THEN 'NO_SHINY_RARITY'
    WHEN "hasShinyRarity" = 1 AND "hasSixPacks" = 0 THEN 'DEFAULT'
    WHEN "hasShinyRarity" = 1 AND "hasSixPacks" = 1 THEN 'POTENTIAL_SIXTH_CARD'
    ELSE 'NO_SHINY_RARITY'
  END
FROM "PokemonBooster";
DROP TABLE "PokemonBooster";
ALTER TABLE "new_PokemonBooster" RENAME TO "PokemonBooster";
CREATE INDEX "PokemonBooster_setId_idx" ON "PokemonBooster"("setId");
CREATE INDEX "PokemonBooster_hasShinyRarity_idx" ON "PokemonBooster"("hasShinyRarity");
CREATE INDEX "PokemonBooster_hasSixPacks_idx" ON "PokemonBooster"("hasSixPacks");
CREATE INDEX "PokemonBooster_probabilitiesType_idx" ON "PokemonBooster"("probabilitiesType");
CREATE INDEX "PokemonBooster_setId_probabilitiesType_idx" ON "PokemonBooster"("setId", "probabilitiesType");
CREATE UNIQUE INDEX "PokemonBooster_setId_name_key" ON "PokemonBooster"("setId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokemonBooster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "hasShinyRarity" BOOLEAN NOT NULL DEFAULT false,
    "hasSixPacks" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PokemonBooster_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PokemonBooster" ("hasShinyRarity", "id", "name", "setId") SELECT "hasShinyRarity", "id", "name", "setId" FROM "PokemonBooster";
DROP TABLE "PokemonBooster";
ALTER TABLE "new_PokemonBooster" RENAME TO "PokemonBooster";
CREATE INDEX "PokemonBooster_setId_idx" ON "PokemonBooster"("setId");
CREATE INDEX "PokemonBooster_hasShinyRarity_idx" ON "PokemonBooster"("hasShinyRarity");
CREATE INDEX "PokemonBooster_hasSixPacks_idx" ON "PokemonBooster"("hasSixPacks");
CREATE UNIQUE INDEX "PokemonBooster_setId_name_key" ON "PokemonBooster"("setId", "name");
CREATE TABLE "new_PokemonCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "rarity" TEXT,
    "isSixPackOnly" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PokemonCard_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PokemonCard" ("id", "name", "number", "rarity", "setId") SELECT "id", "name", "number", "rarity", "setId" FROM "PokemonCard";
DROP TABLE "PokemonCard";
ALTER TABLE "new_PokemonCard" RENAME TO "PokemonCard";
CREATE INDEX "PokemonCard_setId_idx" ON "PokemonCard"("setId");
CREATE INDEX "PokemonCard_rarity_idx" ON "PokemonCard"("rarity");
CREATE INDEX "PokemonCard_name_idx" ON "PokemonCard"("name");
CREATE INDEX "PokemonCard_isSixPackOnly_idx" ON "PokemonCard"("isSixPackOnly");
CREATE UNIQUE INDEX "PokemonCard_setId_number_key" ON "PokemonCard"("setId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

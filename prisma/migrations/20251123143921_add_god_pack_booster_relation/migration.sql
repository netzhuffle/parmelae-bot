-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokemonCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "rarity" TEXT,
    "isSixPackOnly" BOOLEAN NOT NULL DEFAULT false,
    "godPackBoosterId" INTEGER,
    CONSTRAINT "PokemonCard_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PokemonCard_godPackBoosterId_fkey" FOREIGN KEY ("godPackBoosterId") REFERENCES "PokemonBooster" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_PokemonCard" ("id", "isSixPackOnly", "name", "number", "rarity", "setId") SELECT "id", "isSixPackOnly", "name", "number", "rarity", "setId" FROM "PokemonCard";
DROP TABLE "PokemonCard";
ALTER TABLE "new_PokemonCard" RENAME TO "PokemonCard";
CREATE INDEX "PokemonCard_setId_idx" ON "PokemonCard"("setId");
CREATE INDEX "PokemonCard_rarity_idx" ON "PokemonCard"("rarity");
CREATE INDEX "PokemonCard_name_idx" ON "PokemonCard"("name");
CREATE INDEX "PokemonCard_isSixPackOnly_idx" ON "PokemonCard"("isSixPackOnly");
CREATE INDEX "PokemonCard_godPackBoosterId_idx" ON "PokemonCard"("godPackBoosterId");
CREATE UNIQUE INDEX "PokemonCard_setId_number_key" ON "PokemonCard"("setId", "number");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_PokemonBooster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "hasShinyRarity" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "PokemonBooster_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_PokemonBooster" ("id", "name", "setId") SELECT "id", "name", "setId" FROM "PokemonBooster";
DROP TABLE "PokemonBooster";
ALTER TABLE "new_PokemonBooster" RENAME TO "PokemonBooster";
CREATE UNIQUE INDEX "PokemonBooster_setId_name_key" ON "PokemonBooster"("setId", "name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

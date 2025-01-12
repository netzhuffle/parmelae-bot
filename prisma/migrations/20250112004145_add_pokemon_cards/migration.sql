-- CreateTable
CREATE TABLE "PokemonSet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PokemonBooster" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    CONSTRAINT "PokemonBooster_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PokemonCard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "setId" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "rarity" TEXT,
    CONSTRAINT "PokemonCard_setId_fkey" FOREIGN KEY ("setId") REFERENCES "PokemonSet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PokemonBoosterToPokemonCard" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_PokemonBoosterToPokemonCard_A_fkey" FOREIGN KEY ("A") REFERENCES "PokemonBooster" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PokemonBoosterToPokemonCard_B_fkey" FOREIGN KEY ("B") REFERENCES "PokemonCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PokemonSet_key_key" ON "PokemonSet"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonBooster_setId_name_key" ON "PokemonBooster"("setId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonCard_setId_number_key" ON "PokemonCard"("setId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "_PokemonBoosterToPokemonCard_AB_unique" ON "_PokemonBoosterToPokemonCard"("A", "B");

-- CreateIndex
CREATE INDEX "_PokemonBoosterToPokemonCard_B_index" ON "_PokemonBoosterToPokemonCard"("B");

-- CreateTable
CREATE TABLE "_PokemonCardToUser" (
    "A" INTEGER NOT NULL,
    "B" BIGINT NOT NULL,
    CONSTRAINT "_PokemonCardToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "PokemonCard" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PokemonCardToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "_PokemonCardToUser_AB_unique" ON "_PokemonCardToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_PokemonCardToUser_B_index" ON "_PokemonCardToUser"("B");

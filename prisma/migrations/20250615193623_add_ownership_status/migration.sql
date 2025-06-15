/*
  Warnings:

  - You are about to drop the `_PokemonCardToUser` table. If the table is not empty, all the data it contains will be lost.
  - Migration modified to preserve existing ownership data.

*/

-- CreateTable
CREATE TABLE "PokemonCardOwnership" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "cardId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PokemonCardOwnership_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "PokemonCard" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PokemonCardOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Migrate existing ownership data from _PokemonCardToUser to new PokemonCardOwnership table
INSERT INTO "PokemonCardOwnership" ("cardId", "userId", "status", "createdAt", "updatedAt")
SELECT 
    "A" as "cardId",
    "B" as "userId", 
    'OWNED' as "status",
    datetime('now') as "createdAt",
    datetime('now') as "updatedAt"
FROM "_PokemonCardToUser";

-- DropTable (only after data migration)
PRAGMA foreign_keys=off;
DROP TABLE "_PokemonCardToUser";
PRAGMA foreign_keys=on;

-- CreateIndex
CREATE INDEX "PokemonCardOwnership_userId_idx" ON "PokemonCardOwnership"("userId");

-- CreateIndex
CREATE INDEX "PokemonCardOwnership_cardId_idx" ON "PokemonCardOwnership"("cardId");

-- CreateIndex
CREATE INDEX "PokemonCardOwnership_status_idx" ON "PokemonCardOwnership"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonCardOwnership_cardId_userId_key" ON "PokemonCardOwnership"("cardId", "userId");

/*
  Warnings:

  - Added the required column `chatId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Chat"
(
    "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "type"      TEXT    NOT NULL,
    "title"     TEXT,
    "username"  TEXT,
    "firstName" TEXT,
    "lastName"  TEXT
);

-- RedefineTables
PRAGMA
foreign_keys=OFF;
CREATE TABLE "new_Message"
(
    "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromId"           INTEGER  NOT NULL,
    "chatId"           INTEGER  NOT NULL,
    "sentAt"           DATETIME NOT NULL,
    "editedAt"         DATETIME,
    "replyToMessageId" INTEGER,
    "text"             TEXT,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("editedAt", "fromId", "id", "replyToMessageId", "sentAt", "text")
SELECT "editedAt", "fromId", "id", "replyToMessageId", "sentAt", "text"
FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA
foreign_key_check;
PRAGMA
foreign_keys=ON;

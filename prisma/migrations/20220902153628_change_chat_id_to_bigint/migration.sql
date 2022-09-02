/*
  Warnings:

  - The primary key for the `Chat` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `Chat` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - You are about to alter the column `chatId` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA
foreign_keys=OFF;
CREATE TABLE "new_Chat"
(
    "id"        BIGINT NOT NULL PRIMARY KEY,
    "type"      TEXT   NOT NULL,
    "title"     TEXT,
    "username"  TEXT,
    "firstName" TEXT,
    "lastName"  TEXT
);
INSERT INTO "new_Chat" ("firstName", "id", "lastName", "title", "type", "username")
SELECT "firstName", "id", "lastName", "title", "type", "username"
FROM "Chat";
DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";
CREATE TABLE "new_Message"
(
    "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromId"           BIGINT   NOT NULL,
    "chatId"           BIGINT   NOT NULL,
    "sentAt"           DATETIME NOT NULL,
    "editedAt"         DATETIME,
    "replyToMessageId" INTEGER,
    "text"             TEXT,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "editedAt", "fromId", "id", "replyToMessageId", "sentAt", "text")
SELECT "chatId", "editedAt", "fromId", "id", "replyToMessageId", "sentAt", "text"
FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA
foreign_key_check;
PRAGMA
foreign_keys=ON;

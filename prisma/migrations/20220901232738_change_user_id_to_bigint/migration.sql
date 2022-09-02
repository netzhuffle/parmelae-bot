/*
  Warnings:

  - You are about to alter the column `fromId` on the `Message` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.
  - The primary key for the `User` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Int` to `BigInt`.

*/
-- RedefineTables
PRAGMA
foreign_keys=OFF;
CREATE TABLE "new_Message"
(
    "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromId"           BIGINT   NOT NULL,
    "chatId"           INTEGER  NOT NULL,
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
CREATE TABLE "new_User"
(
    "id"           BIGINT  NOT NULL PRIMARY KEY,
    "isBot"        BOOLEAN NOT NULL,
    "firstName"    TEXT    NOT NULL,
    "lastName"     TEXT,
    "username"     TEXT,
    "languageCode" TEXT
);
INSERT INTO "new_User" ("firstName", "id", "isBot", "languageCode", "lastName", "username")
SELECT "firstName", "id", "isBot", "languageCode", "lastName", "username"
FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
PRAGMA
foreign_key_check;
PRAGMA
foreign_keys=ON;

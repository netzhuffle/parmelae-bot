/*
  Warnings:

  - You are about to drop the column `editAt` on the `Message` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA
foreign_keys=OFF;
CREATE TABLE "new_Message"
(
    "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromId"           INTEGER  NOT NULL,
    "sentAt"           DATETIME NOT NULL,
    "editedAt"         DATETIME,
    "replyToMessageId" INTEGER,
    "text"             TEXT,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("fromId", "id", "replyToMessageId", "sentAt", "text")
SELECT "fromId", "id", "replyToMessageId", "sentAt", "text"
FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA
foreign_key_check;
PRAGMA
foreign_keys=ON;

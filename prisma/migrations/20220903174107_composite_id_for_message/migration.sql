/*
  Warnings:

  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA
foreign_keys=OFF;
CREATE TABLE "new_Message"
(
    "id"                   INTEGER  NOT NULL,
    "chatId"               BIGINT   NOT NULL,
    "fromId"               BIGINT   NOT NULL,
    "sentAt"               DATETIME NOT NULL,
    "editedAt"             DATETIME,
    "replyToMessageId"     INTEGER,
    "replyToMessageChatId" BIGINT,
    "text"                 TEXT,

    PRIMARY KEY ("id", "chatId"),
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_replyToMessageChatId_fkey" FOREIGN KEY ("replyToMessageId", "replyToMessageChatId") REFERENCES "Message" ("id", "chatId") ON DELETE SET NULL ON UPDATE CASCADE
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

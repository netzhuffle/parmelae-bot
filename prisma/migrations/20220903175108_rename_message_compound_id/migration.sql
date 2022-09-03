/*
  Warnings:

  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Message` table. All the data in the column will be lost.
  - Added the required column `messageId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA
foreign_keys=OFF;
CREATE TABLE "new_Message"
(
    "messageId"            INTEGER  NOT NULL,
    "chatId"               BIGINT   NOT NULL,
    "fromId"               BIGINT   NOT NULL,
    "sentAt"               DATETIME NOT NULL,
    "editedAt"             DATETIME,
    "replyToMessageId"     INTEGER,
    "replyToMessageChatId" BIGINT,
    "text"                 TEXT,

    PRIMARY KEY ("messageId", "chatId"),
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_replyToMessageChatId_fkey" FOREIGN KEY ("replyToMessageId", "replyToMessageChatId") REFERENCES "Message" ("messageId", "chatId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("messageId", "chatId", "editedAt", "fromId", "replyToMessageChatId", "replyToMessageId",
                           "sentAt", "text")
SELECT "id",
       "chatId",
       "editedAt",
       "fromId",
       "replyToMessageChatId",
       "replyToMessageId",
       "sentAt",
       "text"
FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA
foreign_key_check;
PRAGMA
foreign_keys=ON;

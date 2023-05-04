/*
  Warnings:

  - Made the column `text` on table `Message` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "messageId" INTEGER NOT NULL,
    "chatId" BIGINT NOT NULL,
    "fromId" BIGINT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "editedAt" DATETIME,
    "replyToMessageId" INTEGER,
    "replyToMessageChatId" BIGINT,
    "text" TEXT NOT NULL,
    "stickerFileId" TEXT,

    PRIMARY KEY ("messageId", "chatId"),
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_replyToMessageChatId_fkey" FOREIGN KEY ("replyToMessageId", "replyToMessageChatId") REFERENCES "Message" ("messageId", "chatId") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "editedAt", "fromId", "messageId", "replyToMessageChatId", "replyToMessageId", "sentAt", "stickerFileId", "text") SELECT "chatId", "editedAt", "fromId", "messageId", "replyToMessageChatId", "replyToMessageId", "sentAt", "stickerFileId", "text" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

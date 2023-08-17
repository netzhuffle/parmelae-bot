/*
  Warnings:

  - The primary key for the `Message` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `messageId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the column `replyToMessageChatId` on the `Message` table. All the data in the column will be lost.
  - The primary key for the `ChatEntryMessagesUsers` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `chatId` on the `ChatEntryMessagesUsers` table. All the data in the column will be lost.
  - Added the required column `id` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Message" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramMessageId" INTEGER,
    "chatId" BIGINT NOT NULL,
    "fromId" BIGINT NOT NULL,
    "sentAt" DATETIME NOT NULL,
    "editedAt" DATETIME,
    "replyToMessageId" INTEGER,
    "text" TEXT NOT NULL,
    "stickerFileId" TEXT,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "editedAt", "fromId", "replyToMessageId", "sentAt", "stickerFileId", "text") SELECT "chatId", "editedAt", "fromId", "replyToMessageId", "sentAt", "stickerFileId", "text" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_telegramMessageId_chatId_key" ON "Message"("telegramMessageId", "chatId");
CREATE TABLE "new_ChatEntryMessagesUsers" (
    "messageId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,

    PRIMARY KEY ("messageId", "userId"),
    CONSTRAINT "ChatEntryMessagesUsers_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatEntryMessagesUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatEntryMessagesUsers" ("messageId", "userId") SELECT "messageId", "userId" FROM "ChatEntryMessagesUsers";
DROP TABLE "ChatEntryMessagesUsers";
ALTER TABLE "new_ChatEntryMessagesUsers" RENAME TO "ChatEntryMessagesUsers";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

/*
  Warnings:

  - You are about to drop the column `messageChatId` on the `ChatEntryMessagesUsers` table. All the data in the column will be lost.
  - You are about to drop the column `messageMessageId` on the `ChatEntryMessagesUsers` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatEntryMessagesUsers" (
    "messageId" INTEGER NOT NULL,
    "chatId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,

    PRIMARY KEY ("messageId", "chatId", "userId"),
    CONSTRAINT "ChatEntryMessagesUsers_messageId_chatId_fkey" FOREIGN KEY ("messageId", "chatId") REFERENCES "Message" ("messageId", "chatId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatEntryMessagesUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatEntryMessagesUsers" ("chatId", "messageId", "userId") SELECT "chatId", "messageId", "userId" FROM "ChatEntryMessagesUsers";
DROP TABLE "ChatEntryMessagesUsers";
ALTER TABLE "new_ChatEntryMessagesUsers" RENAME TO "ChatEntryMessagesUsers";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;

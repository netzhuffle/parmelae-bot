-- RedefineTables
PRAGMA defer_foreign_keys=ON;
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
    "imageFileId" TEXT,
    "stickerFileId" TEXT,
    "toolCalls" JSONB,
    "messageAfterToolCallsId" INTEGER,
    CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Message_messageAfterToolCallsId_fkey" FOREIGN KEY ("messageAfterToolCallsId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Message" ("chatId", "editedAt", "fromId", "id", "imageFileId", "replyToMessageId", "sentAt", "stickerFileId", "telegramMessageId", "text", "toolCalls") SELECT "chatId", "editedAt", "fromId", "id", "imageFileId", "replyToMessageId", "sentAt", "stickerFileId", "telegramMessageId", "text", "toolCalls" FROM "Message";
DROP TABLE "Message";
ALTER TABLE "new_Message" RENAME TO "Message";
CREATE UNIQUE INDEX "Message_telegramMessageId_chatId_key" ON "Message"("telegramMessageId", "chatId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

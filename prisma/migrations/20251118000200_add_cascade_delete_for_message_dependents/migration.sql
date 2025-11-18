-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChatEntryMessagesUsers" (
    "messageId" INTEGER NOT NULL,
    "userId" BIGINT NOT NULL,

    PRIMARY KEY ("messageId", "userId"),
    CONSTRAINT "ChatEntryMessagesUsers_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChatEntryMessagesUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChatEntryMessagesUsers" ("messageId", "userId") SELECT "messageId", "userId" FROM "ChatEntryMessagesUsers";
DROP TABLE "ChatEntryMessagesUsers";
ALTER TABLE "new_ChatEntryMessagesUsers" RENAME TO "ChatEntryMessagesUsers";
CREATE TABLE "new_ToolMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" INTEGER NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "ToolMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_ToolMessage" ("id", "messageId", "text", "toolCallId") SELECT "id", "messageId", "text", "toolCallId" FROM "ToolMessage";
DROP TABLE "ToolMessage";
ALTER TABLE "new_ToolMessage" RENAME TO "ToolMessage";
CREATE INDEX "ToolMessage_messageId_idx" ON "ToolMessage"("messageId");
CREATE INDEX "ToolMessage_toolCallId_idx" ON "ToolMessage"("toolCallId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

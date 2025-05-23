-- AlterTable
ALTER TABLE "Message" ADD COLUMN "toolCalls" JSONB;

-- CreateTable
CREATE TABLE "ToolMessage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" INTEGER NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    CONSTRAINT "ToolMessage_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

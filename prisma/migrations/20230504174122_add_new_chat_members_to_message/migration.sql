-- CreateTable
CREATE TABLE "ChatEntryMessagesUsers" (
    "messageId" INTEGER NOT NULL,
    "chatId" BIGINT NOT NULL,
    "userId" BIGINT NOT NULL,
    "messageMessageId" INTEGER NOT NULL,
    "messageChatId" BIGINT NOT NULL,

    PRIMARY KEY ("messageId", "chatId", "userId"),
    CONSTRAINT "ChatEntryMessagesUsers_messageMessageId_messageChatId_fkey" FOREIGN KEY ("messageMessageId", "messageChatId") REFERENCES "Message" ("messageId", "chatId") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatEntryMessagesUsers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

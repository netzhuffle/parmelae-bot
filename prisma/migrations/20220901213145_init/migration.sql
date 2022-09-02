-- CreateTable
CREATE TABLE "Message"
(
    "id"               INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fromId"           INTEGER  NOT NULL,
    "sentAt"           DATETIME NOT NULL,
    "editAt"           DATETIME NOT NULL,
    "replyToMessageId" INTEGER,
    "text"             TEXT,
    CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Message_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "Message" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User"
(
    "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "isBot"        BOOLEAN NOT NULL,
    "firstName"    TEXT    NOT NULL,
    "lastName"     TEXT,
    "username"     TEXT,
    "languageCode" TEXT
);

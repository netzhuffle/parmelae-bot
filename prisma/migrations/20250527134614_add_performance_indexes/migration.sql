-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE INDEX "Message_chatId_sentAt_idx" ON "Message"("chatId", "sentAt");

-- CreateIndex
CREATE INDEX "Message_chatId_id_idx" ON "Message"("chatId", "id");

-- CreateIndex
CREATE INDEX "Message_sentAt_idx" ON "Message"("sentAt");

-- CreateIndex
CREATE INDEX "Message_fromId_idx" ON "Message"("fromId");

-- CreateIndex
CREATE INDEX "Message_replyToMessageId_idx" ON "Message"("replyToMessageId");

-- CreateIndex
CREATE INDEX "PokemonBooster_setId_idx" ON "PokemonBooster"("setId");

-- CreateIndex
CREATE INDEX "PokemonBooster_hasShinyRarity_idx" ON "PokemonBooster"("hasShinyRarity");

-- CreateIndex
CREATE INDEX "PokemonCard_setId_idx" ON "PokemonCard"("setId");

-- CreateIndex
CREATE INDEX "PokemonCard_rarity_idx" ON "PokemonCard"("rarity");

-- CreateIndex
CREATE INDEX "PokemonCard_name_idx" ON "PokemonCard"("name");

-- CreateIndex
CREATE INDEX "PokemonSet_name_idx" ON "PokemonSet"("name");

-- CreateIndex
CREATE INDEX "ScheduledMessage_sendAt_idx" ON "ScheduledMessage"("sendAt");

-- CreateIndex
CREATE INDEX "ScheduledMessage_chatId_idx" ON "ScheduledMessage"("chatId");

-- CreateIndex
CREATE INDEX "ScheduledMessage_fromId_idx" ON "ScheduledMessage"("fromId");

-- CreateIndex
CREATE INDEX "ToolMessage_messageId_idx" ON "ToolMessage"("messageId");

-- CreateIndex
CREATE INDEX "ToolMessage_toolCallId_idx" ON "ToolMessage"("toolCallId");

-- CreateIndex
CREATE INDEX "User_isBot_idx" ON "User"("isBot");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

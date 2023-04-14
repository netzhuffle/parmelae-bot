import { AIChatMessage, BaseChatMessage } from "langchain/schema";
import { GptModelsProvider } from "../GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { GitCommitAnnouncementGenerator } from "./GitCommitAnnouncementGenerator";
import { ChatGptServiceFakeFactory, ChatOpenAiFake } from "../Fakes/ChatGptServiceFakeFactory";

test('generate', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('Commit Description'));
    const sut = new GitCommitAnnouncementGenerator(
        ChatGptServiceFakeFactory.create(
            new GptModelsProvider(
                {
                    chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
                    chatGptStrict: undefined as any,
                    gpt4: undefined as any,
                    embeddings: undefined as any,
                }),
        )
    );

    const response = await sut.generate('git commit message');

    expect(response).toEqual('Commit Description');
    expect(chatOpenAiFake.request).toHaveLength(12);
    expect(chatOpenAiFake.request?.[11].text).toBe('git commit message');
});

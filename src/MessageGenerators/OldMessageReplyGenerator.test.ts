import { AIChatMessage } from "langchain/schema";
import { GptModelsProvider } from "../GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OldMessageReplyGenerator } from "./OldMessageReplyGenerator";
import { ChatGptServiceFakeFactory, ChatOpenAiFake } from "../Fakes/ChatGptServiceFakeFactory";

test('generate', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('Reply'));
    const sut = new OldMessageReplyGenerator(
        ChatGptServiceFakeFactory.create(
            new GptModelsProvider(
                {
                    chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
                    chatGptStrict: undefined as any,
                    gpt4: undefined as any,
                    gpt4Strict: undefined as any,
                    embeddings: undefined as any,
                }),
        )
    );

    const response = await sut.generate('old message');

    expect(response).toEqual('Reply');
    expect(chatOpenAiFake.request).toHaveLength(16);
    expect(chatOpenAiFake.request?.[15].text).toBe('old message');
});

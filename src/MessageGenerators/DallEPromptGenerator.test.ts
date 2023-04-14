import { AIChatMessage } from "langchain/schema";
import { DallEPromptGenerator } from "./DallEPromptGenerator";
import { GptModelsProvider } from "../GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { ChatGptServiceFakeFactory, ChatOpenAiFake } from "../Fakes/ChatGptServiceFakeFactory";

test('generate', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('DALL-E description'));
    const sut = new DallEPromptGenerator(
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

    const response = await sut.generate('image description');

    expect(response).toEqual('DALL-E description');
    expect(chatOpenAiFake.request).toHaveLength(6);
    expect(chatOpenAiFake.request?.[5].text).toBe('image description');
});

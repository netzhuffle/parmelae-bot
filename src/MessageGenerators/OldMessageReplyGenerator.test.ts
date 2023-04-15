import { AIChatMessage } from "langchain/schema";
import { GptModelsProvider } from "../GptModelsProvider";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { OldMessageReplyGenerator } from "./OldMessageReplyGenerator";
import { ChatGptService } from "../ChatGptService";
import { ChatOpenAiFake } from "../Fakes/ChatOpenAiFake";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { CallbackManager } from "langchain/callbacks";

test('generate', async () => {
    const chatOpenAiFake = new ChatOpenAiFake(new AIChatMessage('Reply'));
    const sut = new OldMessageReplyGenerator(
        new ChatGptService(
            new GptModelsProvider({
                chatGpt: chatOpenAiFake as unknown as ChatOpenAI,
                chatGptStrict: undefined as unknown as ChatOpenAI,
                gpt4: undefined as unknown as ChatOpenAI,
                gpt4Strict: undefined as unknown as ChatOpenAI,
                embeddings: undefined as unknown as OpenAIEmbeddings,
            }),
            undefined as unknown as CallbackManager,
        ),
    );

    const response = await sut.generate('old message');

    expect(response).toEqual('Reply');
    expect(chatOpenAiFake.request).toHaveLength(16);
    expect(chatOpenAiFake.request?.[15].text).toBe('old message');
});

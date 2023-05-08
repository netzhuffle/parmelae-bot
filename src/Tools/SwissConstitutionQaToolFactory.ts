import { PineconeClient } from '@pinecone-database/pinecone';
import { ChainTool } from 'langchain/tools';
import { PineconeStore } from 'langchain/vectorstores/pinecone';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider';
import { VectorDBQAChain } from 'langchain/chains';
import { Config } from '../Config';

@injectable()
export class SwissConstitutionQaToolFactory {
  constructor(
    private readonly chatGptModelsProvider: GptModelsProvider,
    private readonly config: Config,
  ) {}

  async create(): Promise<ChainTool> {
    const client = new PineconeClient();
    await client.init({
      apiKey: this.config.pineconeApiKey,
      environment: this.config.pineconeEnvironment,
    });
    const vectorStore = await PineconeStore.fromExistingIndex(
      this.chatGptModelsProvider.embeddings,
      {
        pineconeIndex: client.Index(this.config.pineconeIndex),
      },
    );
    const chain = VectorDBQAChain.fromLLM(
      this.config.useGpt4
        ? this.chatGptModelsProvider.gpt4Strict
        : this.chatGptModelsProvider.chatGptStrict,
      vectorStore,
      {
        verbose: true,
      },
    );

    return new ChainTool({
      name: 'swiss-constitution-qa',
      description:
        'Use to read the Swiss constitution and do research in it. Important: You MUST use this tool before answering any questions about the constitution. Input should be a fully formed question.',
      chain,
    });
  }
}

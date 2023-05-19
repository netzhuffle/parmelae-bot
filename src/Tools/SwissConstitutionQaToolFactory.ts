import { ChainTool } from 'langchain/tools';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider';
import { VectorDBQAChain } from 'langchain/chains';
import { Config } from '../Config';
import { SwissConstitutionVectorStore } from '../VectorStores/SwissConstitutionVectorStore';

@injectable()
export class SwissConstitutionQaToolFactory {
  constructor(
    private readonly vectorStore: SwissConstitutionVectorStore,
    private readonly chatGptModelsProvider: GptModelsProvider,
    private readonly config: Config,
  ) {}

  async create(): Promise<ChainTool> {
    const vectorStore = await this.vectorStore.get();
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

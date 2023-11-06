import { ChainTool } from 'langchain/tools';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { VectorDBQAChain } from 'langchain/chains';
import { Config } from '../Config.js';
import { SwissConstitutionVectorStore } from '../VectorStores/SwissConstitutionVectorStore.js';

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
      this.chatGptModelsProvider.getStrictModel(this.config.gptModel),
      vectorStore,
      {
        verbose: true,
      },
    );

    return new ChainTool({
      name: 'swiss-constitution-qa',
      description:
        'Use to ask a question to the Swiss constitution and do research in it. Important: You MUST use this tool before answering any questions about the constitution. Input should be a fully formed question about what you want to ask the constitution.',
      chain,
    });
  }
}

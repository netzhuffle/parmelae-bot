import { ChainTool } from 'langchain/tools';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider';
import { VectorDBQAChain } from 'langchain/chains';
import { Config } from '../Config';
import { GitHubVectorStore } from '../VectorStores/GitHubVectorStore';

@injectable()
export class GitHubToolFactory {
  constructor(
    private readonly vectorStore: GitHubVectorStore,
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
      name: 'github-qa',
      description:
        'Use to answer questions about the @ParmelaeBot source code within your own GitHub repository. Input should be a fully formed question that does not mention GitHub.',
      chain,
    });
  }
}

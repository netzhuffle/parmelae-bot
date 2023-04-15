import { ChainTool } from 'langchain/tools';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider';
import { VectorDBQAChain } from 'langchain/chains';
import { Config } from '../Config';
import { CallbackManager } from 'langchain/callbacks';
import { GithubRepoLoader } from 'langchain/document_loaders/web/github';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

@injectable()
export class GitHubToolFactory {
  constructor(
    private readonly chatGptModelsProvider: GptModelsProvider,
    private readonly config: Config,
    private readonly callbackManager: CallbackManager,
  ) {}

  async create(): Promise<ChainTool> {
    const loader = new GithubRepoLoader(
      'https://github.com/netzhuffle/parmelae-bot',
      {
        accessToken: this.config.gitHubPersonalAccessToken,
      },
    );
    const docs = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    const vectorStore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      this.chatGptModelsProvider.embeddings,
    );
    const chain = VectorDBQAChain.fromLLM(
      this.config.useGpt4
        ? this.chatGptModelsProvider.gpt4Strict
        : this.chatGptModelsProvider.chatGptStrict,
      vectorStore,
    );
    chain.callbackManager = this.callbackManager;
    chain.verbose = true;

    return new ChainTool({
      name: 'github-qa',
      description:
        'Use to answer questions about your source code in your GitHub repository. Input should be a fully formed question that does not mention GitHub.',
      chain,
    });
  }
}

import { VectorStoreInterface } from '@langchain/core/vectorstores';
import { SingleVectorStoreInterface } from '../VectorStoreInterface.js';
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { Config } from '../Config.js';

/** GitHub vector store. */
@injectable()
export class GitHubVectorStore implements SingleVectorStoreInterface {
  private vectorStore: VectorStoreInterface | undefined;

  constructor(
    private readonly chatGptModelsProvider: GptModelsProvider,
    private readonly config: Config,
  ) {}

  private async prepare(): Promise<void> {
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
    this.vectorStore = await HNSWLib.fromDocuments(
      splitDocs,
      this.chatGptModelsProvider.embeddings,
    );
  }

  async get(): Promise<VectorStoreInterface> {
    if (!this.vectorStore) {
      await this.prepare();
      if (!this.vectorStore) {
        throw new UninitializedVectorStore();
      }
    }

    return this.vectorStore;
  }
}

class UninitializedVectorStore extends Error {}

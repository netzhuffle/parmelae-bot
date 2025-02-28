import {
  VectorStoreInterface,
  VectorStoreRetriever,
} from '@langchain/core/vectorstores';
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { HNSWLib } from '@langchain/community/vectorstores/hnswlib';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider.js';
import { Config } from '../Config.js';

/** GitHub vector store. */
@injectable()
export class GitHubVectorStore {
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
      chunkSize: 1000,
      chunkOverlap: 200,
    });
    const splitDocs = await splitter.splitDocuments(docs);
    this.vectorStore = await HNSWLib.fromDocuments(
      splitDocs,
      this.chatGptModelsProvider.embeddings,
    );
  }

  async getRetriever(): Promise<VectorStoreRetriever> {
    if (!this.vectorStore) {
      await this.prepare();
      if (!this.vectorStore) {
        throw new UninitializedVectorStore();
      }
    }

    return this.vectorStore.asRetriever();
  }
}

class UninitializedVectorStore extends Error {}

import { VectorStore } from 'langchain/dist/vectorstores/base';
import { SingleVectorStore } from '../VectorStore';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';
import { injectable } from 'inversify';
import { GptModelsProvider } from '../GptModelsProvider';

/** Swiss constitution vector store. */
@injectable()
export class SwissConstitutionVectorStore implements SingleVectorStore {
  private vectorStore: VectorStore | undefined;

  constructor(private readonly chatGptModelsProvider: GptModelsProvider) {}

  private async prepare(): Promise<void> {
    const loader = new PDFLoader('documents/swiss-constitution.pdf');
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

  async get(): Promise<VectorStore> {
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

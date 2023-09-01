import { VectorStore } from 'langchain/vectorstores/base';

/** A vector store. */
export interface SingleVectorStore {
  /** Returns the vector store. */
  get(): Promise<VectorStore>;
}

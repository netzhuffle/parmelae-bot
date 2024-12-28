import { VectorStoreInterface } from '@langchain/core/vectorstores';

/** A vector store. */
export interface SingleVectorStoreInterface {
  /** Returns the vector store. */
  get(): Promise<VectorStoreInterface>;
}

import { DynamicStructuredTool } from 'langchain/tools';
import { injectable } from 'inversify';
import { GitHubVectorStore } from '../VectorStores/GitHubVectorStore.js';
import { createRetrieverTool } from 'langchain/tools/retriever';
import { ZodObject, ZodString, ZodTypeAny } from 'zod';

type RetrieverTool = DynamicStructuredTool<
  ZodObject<
    {
      query: ZodString;
    },
    'strip',
    ZodTypeAny,
    {
      query: string;
    },
    {
      query: string;
    }
  >
>;

@injectable()
export class GitHubToolFactory {
  constructor(private readonly vectorStore: GitHubVectorStore) {}

  async create(): Promise<RetrieverTool> {
    const retriever = await this.vectorStore.getRetriever();
    return createRetrieverTool(retriever, {
      name: 'github-qa',
      description:
        'Use to answer questions about the @ParmelaeBot source code within your own GitHub repository. Input should be a fully formed question that does not mention GitHub.',
    });
  }
}

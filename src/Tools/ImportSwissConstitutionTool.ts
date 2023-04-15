import { Tool } from "langchain/agents";
import { PuppeteerWebBaseLoader } from "langchain/document_loaders/web/puppeteer";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { injectable } from "inversify";
import { Config } from "../Config";
import { GptModelsProvider } from "../GptModelsProvider";

@injectable()
export class ImportSwissConstitutionTool extends Tool {
    name = 'import-swiss-constitution';

    description = `Import the Swiss constitution into an index. Input should be an empty string. Output is the string 'success'.`;

    constructor(
        private readonly chatGptModelsProvider: GptModelsProvider,
        private readonly config: Config,
    ) {
        super();
    }

    protected async _call(arg: string): Promise<string> {
        const loader = new PuppeteerWebBaseLoader('https://www.fedlex.admin.ch/eli/cc/1999/404/de', {
            gotoOptions: {
                waitUntil: 'networkidle0',
            },
        });
        const docs = await loader.load();
        console.log(docs);
        const splitter = new RecursiveCharacterTextSplitter();
        const splitDocs = await splitter.splitDocuments(docs);
        console.log(splitDocs);

        const client = new PineconeClient();
        await client.init({
            apiKey: this.config.pineconeApiKey,
            environment: this.config.pineconeEnvironment,
        });
        await PineconeStore.fromDocuments(splitDocs, this.chatGptModelsProvider.embeddings, {
            pineconeIndex: client.Index(this.config.pineconeIndex),
        });
        return 'success';
    }
}
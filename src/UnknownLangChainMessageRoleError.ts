/** Error for a LangChain ChatMessage with unknown role. */
export class UnknownLangChainMessageRoleError extends Error {
    constructor(role: string) {
        super(`Unknown LangChain ChatMessage role: ${role}`);
    }
}

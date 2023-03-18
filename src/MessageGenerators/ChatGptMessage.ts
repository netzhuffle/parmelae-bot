export enum ChatGptRole {
    System,
    User,
    Assistant,
}

/** A message for the ChatGPT API. */
export type ChatGptMessage = {
    /** Role of message author. */
    role: ChatGptRole,
    /** Message content. */
    content: string,
    /** Author username in case of User role. */
    name?: string,
}

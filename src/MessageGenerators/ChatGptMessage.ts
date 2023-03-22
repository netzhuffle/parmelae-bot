export const ChatGptRoles = {
    System: 'system',
    User: 'user',
    Assistant: 'assistant',
} as const;

export type ChatGptRole = typeof ChatGptRoles[keyof typeof ChatGptRoles];

/** A message for the ChatGPT API. */
export type ChatGptMessage = {
    /** Role of message author. */
    role: ChatGptRole,
    /** Message content. */
    content: string,
    /** Author username in case of User role. */
    name?: string,
}

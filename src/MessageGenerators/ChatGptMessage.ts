export const ChatGptRoles = {
    System: 'system',
    User: 'user',
    Assistant: 'assistant',
} as const;

export type ChatGptRole = typeof ChatGptRoles[keyof typeof ChatGptRoles];

/** A message for the ChatGPT API. */
export type ChatGptMessage = {
    /** Role of message author. */
    role: typeof ChatGptRoles.System | typeof ChatGptRoles.Assistant,
    /** Message content. */
    content: string,
} | {
    /** Role of message author. */
    role: typeof ChatGptRoles.User,
    /** Message content. */
    content: string,
    /** Author username. */
    name?: string,
}

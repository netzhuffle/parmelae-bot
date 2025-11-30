/**
 * Error thrown when attempting to resolve an identity name that doesn't exist.
 */
export class UnknownIdentityError extends Error {
  constructor(
    public readonly input: string,
    public readonly available: readonly string[],
  ) {
    const availableNames = available.join('", "');
    super(
      `Unknown identity "${input}". Available identities: "${availableNames}".`,
    );
    this.name = 'UnknownIdentityError';
  }
}

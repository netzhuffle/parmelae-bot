import { injectable } from 'inversify';
import { Identity } from './Identity.js';
import { SchiParmelaeIdentity } from './SchiParmelaeIdentity.js';
import { EmulatorIdentity } from './EmulatorIdentity.js';
import { UnknownIdentityError } from './UnknownIdentityError.js';

/**
 * Service for resolving identity name strings to Identity instances.
 *
 * Provides case-insensitive string-to-Identity mapping with extensible
 * registration support. Used by tools and configuration parsing to resolve
 * identity names from environment variables or user input.
 *
 * @example
 * ```typescript
 * const resolver = container.get(IdentityResolverService);
 * const identity = resolver.resolve('Schi Parmelä'); // Returns SchiParmelaeIdentity
 * const identity2 = resolver.resolve('emulator'); // Returns EmulatorIdentity (case-insensitive)
 * ```
 */
@injectable()
export class IdentityResolverService {
  private readonly identityMap: Map<string, Identity>;

  constructor(
    private readonly schiParmelaeIdentity: SchiParmelaeIdentity,
    private readonly emulatorIdentity: EmulatorIdentity,
  ) {
    // Build map with normalized keys (lowercase) for case-insensitive lookup
    this.identityMap = new Map<string, Identity>();
    this.identityMap.set(
      this.normalizeName(schiParmelaeIdentity.name),
      schiParmelaeIdentity,
    );
    this.identityMap.set(
      this.normalizeName(emulatorIdentity.name),
      emulatorIdentity,
    );
  }

  /**
   * Resolves an identity name string to its corresponding Identity instance.
   *
   * Performs case-insensitive matching and trims whitespace from the input.
   * Throws a descriptive error if the identity is not found, listing all
   * available identity names.
   *
   * @param identityName - The name of the identity to resolve (e.g., "Schi Parmelä" or "Emulator")
   * @returns The corresponding Identity instance
   * @throws {Error} If the identity name is not found or is empty
   *
   * @example
   * ```typescript
   * const identity = resolver.resolve('Schi Parmelä');
   * const identity2 = resolver.resolve('  emulator  '); // Trims whitespace
   * const identity3 = resolver.resolve('EMULATOR'); // Case-insensitive
   * ```
   */
  resolve(identityName: string): Identity {
    const normalizedName = this.normalizeName(identityName);
    const identity = this.identityMap.get(normalizedName);

    if (!identity) {
      // Use original identity names (not normalized keys) for error message
      const availableNames = Array.from(this.identityMap.values()).map(
        (id) => id.name,
      );
      throw new UnknownIdentityError(identityName, availableNames);
    }

    return identity;
  }

  /**
   * Normalizes an identity name for case-insensitive comparison.
   *
   * Trims whitespace and converts to lowercase.
   *
   * @param name - The identity name to normalize
   * @returns The normalized name (trimmed and lowercase)
   */
  private normalizeName(name: string): string {
    return name.trim().toLowerCase();
  }
}

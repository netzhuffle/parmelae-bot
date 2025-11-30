import { describe, beforeEach, it, expect } from 'bun:test';
import { IdentityResolverService } from './IdentityResolverService.js';
import { SchiParmelaeIdentity } from './SchiParmelaeIdentity.js';
import { EmulatorIdentity } from './EmulatorIdentity.js';

describe('IdentityResolverService', () => {
  let resolver: IdentityResolverService;
  let schiParmelaeIdentity: SchiParmelaeIdentity;
  let emulatorIdentity: EmulatorIdentity;

  beforeEach(() => {
    schiParmelaeIdentity = new SchiParmelaeIdentity();
    emulatorIdentity = new EmulatorIdentity();
    resolver = new IdentityResolverService(
      schiParmelaeIdentity,
      emulatorIdentity,
    );
  });

  describe('resolve', () => {
    it('should resolve "Schi Parmelä" correctly', () => {
      const identity = resolver.resolve('Schi Parmelä');
      expect(identity).toBe(schiParmelaeIdentity);
      expect(identity.name).toBe('Schi Parmelä');
    });

    it('should resolve "Emulator" correctly', () => {
      const identity = resolver.resolve('Emulator');
      expect(identity).toBe(emulatorIdentity);
      expect(identity.name).toBe('Emulator');
    });

    it('should resolve case-insensitively', () => {
      expect(resolver.resolve('SCHI PARMELÄ')).toBe(schiParmelaeIdentity);
      expect(resolver.resolve('schi parmelä')).toBe(schiParmelaeIdentity);
      expect(resolver.resolve('Schi Parmelä')).toBe(schiParmelaeIdentity);
      expect(resolver.resolve('EMULATOR')).toBe(emulatorIdentity);
      expect(resolver.resolve('emulator')).toBe(emulatorIdentity);
      expect(resolver.resolve('Emulator')).toBe(emulatorIdentity);
    });

    it('should trim whitespace from input', () => {
      expect(resolver.resolve('  Schi Parmelä  ')).toBe(schiParmelaeIdentity);
      expect(resolver.resolve('\tEmulator\n')).toBe(emulatorIdentity);
      expect(resolver.resolve('  EMULATOR  ')).toBe(emulatorIdentity);
    });

    it('should throw descriptive error for unknown identity', () => {
      expect(() => resolver.resolve('Unknown Identity')).toThrow(
        'Unknown identity "Unknown Identity". Available identities: "Schi Parmelä", "Emulator".',
      );
    });

    it('should throw error for empty string', () => {
      expect(() => resolver.resolve('')).toThrow(
        'Unknown identity "". Available identities: "Schi Parmelä", "Emulator".',
      );
    });

    it('should throw error for whitespace-only string', () => {
      expect(() => resolver.resolve('   ')).toThrow(
        'Unknown identity "   ". Available identities: "Schi Parmelä", "Emulator".',
      );
    });

    it('should throw error for partial match', () => {
      expect(() => resolver.resolve('Schi')).toThrow(
        'Unknown identity "Schi". Available identities: "Schi Parmelä", "Emulator".',
      );
      expect(() => resolver.resolve('Parmelä')).toThrow(
        'Unknown identity "Parmelä". Available identities: "Schi Parmelä", "Emulator".',
      );
    });
  });
});

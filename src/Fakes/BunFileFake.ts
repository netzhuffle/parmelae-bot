import type { BunFile } from 'bun';

/**
 * Fake implementation of BunFile for testing purposes.
 * Returns the provided content when .text() is called.
 * Uses type assertion to simplify implementation for testing.
 */
export class BunFileFake {
  constructor(private readonly content: string) {}

  text(): Promise<string> {
    return Promise.resolve(this.content);
  }

  // Implement minimal BunFile-like methods for testing
  get size(): number {
    return this.content.length;
  }

  readonly type = 'text/plain';

  arrayBuffer(): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const uint8Array = encoder.encode(this.content);
    // Create a new ArrayBuffer to ensure type compatibility
    const buffer = new ArrayBuffer(uint8Array.length);
    new Uint8Array(buffer).set(uint8Array);
    return Promise.resolve(buffer);
  }

  bytes(): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    return Promise.resolve(encoder.encode(this.content));
  }

  json(): Promise<unknown> {
    return Promise.resolve(JSON.parse(this.content));
  }

  stream(): ReadableStream {
    const content = this.content;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(content));
        controller.close();
      },
    });
  }

  exists(): Promise<boolean> {
    return Promise.resolve(true);
  }
}

// Export a helper function that casts to BunFile for type compatibility
export function createBunFileFake(content: string): BunFile {
  return new BunFileFake(content) as unknown as BunFile;
}

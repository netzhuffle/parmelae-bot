/** Receives incremental text output while a model response is being generated. */
export interface StreamingTextSink {
  appendText(text: string): Promise<void>;
  reset(): Promise<void>;
}

/** A StreamingTextSink that can also send and persist the final Telegram message. */
export interface FinalizableStreamingTextSink extends StreamingTextSink {
  sendFinalText(text: string): Promise<number>;
}

/** Fans one streamed response out to multiple sinks. */
export class CompositeStreamingTextSink implements StreamingTextSink {
  constructor(private readonly sinks: readonly StreamingTextSink[]) {}

  async appendText(text: string): Promise<void> {
    await Promise.all(this.sinks.map((sink) => sink.appendText(text)));
  }

  async reset(): Promise<void> {
    await Promise.all(this.sinks.map((sink) => sink.reset()));
  }
}

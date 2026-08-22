export interface LlmProvider {
  /** Sends a single prompt and returns the raw completion text. */
  complete(prompt: string): Promise<string>;
}

import { LlmProvider } from "./llm.types";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`LLM call timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface RunJsonCompletionInput<T> {
  provider: LlmProvider;
  prompt: string;
  timeoutMs: number;
  /** Parses and validates the raw completion text; throw to reject and fall back. */
  parse: (raw: string) => T;
  fallback: () => T;
}

/**
 * Runs an LLM completion expected to be JSON, with a hard timeout and a
 * fallback on any failure (timeout, network error, invalid JSON, or a shape
 * that fails validation). Never throws — the caller always gets a value, so
 * an LLM outage can never block the booking/visit flow it's called from.
 */
export async function runJsonCompletion<T>(input: RunJsonCompletionInput<T>): Promise<T> {
  try {
    const raw = await withTimeout(input.provider.complete(input.prompt), input.timeoutMs);
    return input.parse(raw);
  } catch (error) {
    console.error("LLM generation failed, using fallback:", error);
    return input.fallback();
  }
}

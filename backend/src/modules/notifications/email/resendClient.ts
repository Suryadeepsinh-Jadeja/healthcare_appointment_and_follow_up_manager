import { Resend } from "resend";
import { env } from "../../../config/env";

let client: Resend | undefined;

/**
 * Lazy: the Resend constructor throws synchronously if the key is empty, and
 * this module is imported at process startup (before any request/job has
 * run) — constructing eagerly would crash the server/worker on boot in any
 * environment where RESEND_API_KEY isn't set yet, instead of surfacing as a
 * normal per-send failure that the retry/fallback path already handles.
 */
export function getResendClient(): Resend {
  if (!client) {
    client = new Resend(env.resendApiKey);
  }
  return client;
}

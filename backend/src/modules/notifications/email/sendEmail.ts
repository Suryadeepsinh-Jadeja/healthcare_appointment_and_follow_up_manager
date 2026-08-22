import { env } from "../../../config/env";
import { resendClient } from "./resendClient";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

/** Throws on failure so a BullMQ job processor's own retry policy takes over. */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { error } = await resendClient.emails.send({
    from: env.emailFrom,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }
}

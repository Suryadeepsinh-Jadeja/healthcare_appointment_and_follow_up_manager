import { Resend } from "resend";
import { env } from "../../../config/env";

export const resendClient = new Resend(env.resendApiKey);

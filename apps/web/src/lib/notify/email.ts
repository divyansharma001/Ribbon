import "server-only";
import { Resend } from "resend";
import { requireEnv } from "../env";

/** True when this server can send email (RESEND_API_KEY and EMAIL_FROM are set). */
export function emailReady(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

/**
 * Sends one email through Resend. Throws if Resend refuses it.
 *
 * `idempotencyKey` makes a retry within 24 hours a no-op on Resend's side,
 * so a job that runs twice never sends the same email twice.
 */
export async function sendEmail(email: {
  to: string;
  subject: string;
  text: string;
  html: string;
  idempotencyKey: string;
  /** Shown by mail apps as their own "Unsubscribe" button (one click, RFC 8058). */
  unsubscribeUrl: string;
}): Promise<string> {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const { data, error } = await resend.emails.send(
    {
      from: requireEnv("EMAIL_FROM"),
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      headers: {
        "List-Unsubscribe": `<${email.unsubscribeUrl}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    },
    { idempotencyKey: email.idempotencyKey },
  );
  if (error) throw new Error(`Resend refused the email: ${error.name}: ${error.message}`);
  return data.id;
}

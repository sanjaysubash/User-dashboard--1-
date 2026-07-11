import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";

// Returns whether the email actually went out, so callers with user-facing
// "alert sent" confirmations can report the truth instead of assuming success.
export async function sendMail(to: string | string[], subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set — skipping email send:", subject);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: MAIL_FROM, to, subject, html });
    if (error) {
      console.error("Failed to send email:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Failed to send email:", err);
    return false;
  }
}

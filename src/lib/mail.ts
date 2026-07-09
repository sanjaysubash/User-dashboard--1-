import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const MAIL_FROM = process.env.MAIL_FROM || "onboarding@resend.dev";

export async function sendMail(to: string | string[], subject: string, html: string) {
  if (!resend) {
    console.warn("RESEND_API_KEY is not set — skipping email send:", subject);
    return;
  }
  try {
    await resend.emails.send({ from: MAIL_FROM, to, subject, html });
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}

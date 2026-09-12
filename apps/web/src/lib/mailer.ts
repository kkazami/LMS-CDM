import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

/**
 * Parses and sanitizes SMTP configuration from environment variables.
 * In development mode, also checks .env.local and .env on disk so that changes
 * to SMTP credentials take effect immediately without requiring a dev server restart.
 */
function getSmtpConfig() {
  let host = process.env.SMTP_HOST?.trim();
  let port = Number(process.env.SMTP_PORT) || 587;
  let secure = process.env.SMTP_SECURE === "true" || port === 465;
  let user = process.env.SMTP_USER?.trim();
  let pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, "").trim() : undefined;
  let from = process.env.SMTP_FROM?.trim();

  // In local dev, read directly from .env.local / .env on disk if present to pick up edits without restart
  if (process.env.NODE_ENV !== "production") {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), "apps/web/.env.local"),
        path.resolve(process.cwd(), "../../.env"),
      ];

      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf-8");
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("#")) continue;
            const eqIdx = trimmed.indexOf("=");
            if (eqIdx === -1) continue;
            const key = trimmed.slice(0, eqIdx).trim();
            let val = trimmed.slice(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (key === "SMTP_HOST") host = val.trim();
            if (key === "SMTP_PORT") port = Number(val) || 587;
            if (key === "SMTP_SECURE") secure = val === "true" || port === 465;
            if (key === "SMTP_USER") user = val.trim();
            if (key === "SMTP_PASS") pass = val.replace(/\s+/g, "").trim();
            if (key === "SMTP_FROM") from = val.trim();
          }
          break;
        }
      }
    } catch {
      // Fallback to process.env
    }
  }

  const finalFrom = from || (user ? `"CdM LMS Admin" <${user}>` : '"CdM LMS Admin" <no-reply@lms.edu>');

  return { host, port, secure, user, pass, from: finalFrom };
}

/**
 * Creates a nodemailer transport with proper timeouts.
 * If SMTP credentials are missing, returns a stream transport for local logging.
 */
function createTransport() {
  const config = getSmtpConfig();

  if (config.host && config.user && config.pass) {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }

  // Fallback to ethereal/console stream transport for local dev without SMTP
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "windows",
  });
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  deliveredVia: "smtp" | "console" | "console_fallback";
  messageId?: string;
  error?: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<SendEmailResult> {
  const config = getSmtpConfig();
  const mailOptions = {
    from: config.from,
    to,
    subject,
    html,
  };

  const hasSmtp = Boolean(config.host && config.user && config.pass);

  if (!hasSmtp) {
    console.log("=================================================");
    console.log("📧 MOCK EMAIL SENT (No SMTP Credentials in env)");
    console.log("=================================================");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("Body:");
    console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
    console.log("=================================================");
    return { success: true, deliveredVia: "console" };
  }

  const transporter = createTransport();

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Mailer] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, deliveredVia: "smtp", messageId: info.messageId };
  } catch (error: any) {
    const errorMessage = error?.message || String(error);
    console.error("[Mailer] Failed to send email via SMTP:", errorMessage);

    // In local development or testing, fall back to console output so workflow isn't blocked
    if (process.env.NODE_ENV !== "production") {
      console.log("=================================================");
      console.log("⚠️  SMTP FAILED — FALLBACK EMAIL SENT TO CONSOLE");
      console.log(`Error: ${errorMessage}`);
      console.log("-------------------------------------------------");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("Body content:");
      console.log(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      console.log("=================================================");

      return {
        success: true,
        deliveredVia: "console_fallback",
        error: errorMessage,
      };
    }

    throw error;
  }
}

import nodemailer from "nodemailer";

/**
 * Creates a nodemailer transport.
 * If SMTP_HOST is not set in environment variables, it defaults to a mock console transport
 * which is useful for local development and testing without a real email provider.
 */
function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to ethereal/console transport for local dev
  return nodemailer.createTransport({
    streamTransport: true,
    newline: "windows",
  });
}

const transporter = createTransport();

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions) {
  const mailOptions = {
    from: process.env.SMTP_FROM || '"LMS Admin" <no-reply@lms.edu>',
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    
    // If using stream transport (local dev fallback), read the stream and log it
    const infoStream = (info as any).message;
    if (!process.env.SMTP_HOST && infoStream) {
      // infoStream is a readable stream when using streamTransport
      const chunks = [];
      for await (const chunk of infoStream) {
        chunks.push(chunk);
      }
      const messageStr = Buffer.concat(chunks).toString("utf-8");
      
      console.log("=========================================");
      console.log("📧 MOCK EMAIL SENT (Console Transport)");
      console.log("=========================================");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("Body:");
      console.log(messageStr);
      console.log("=========================================");
    } else {
      console.log("Email sent successfully", info.messageId);
    }
  } catch (error) {
    console.error("Failed to send email", error);
    throw error;
  }
}

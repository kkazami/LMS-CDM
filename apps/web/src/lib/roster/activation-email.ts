import { getInstituteTheme } from "../get-institute-theme";
import { escapeHtml } from "./invitation-rules";

type ActivationEmail = {
  name: string;
  studentNumber: string | null;
  program: string;
  instituteCode: string;
  link: string;
  reminder: boolean;
};

export function activationEmail(account: ActivationEmail) {
  const theme = getInstituteTheme(account.instituteCode);
  const accent = theme.colors.primary;
  const ink = theme.code === "ite" ? "#FFFFFF" : "#0F172A";
  const name = escapeHtml(account.name);
  const link = escapeHtml(account.link);
  const heading = account.reminder
    ? "Your learning space is waiting."
    : "Your learning space is ready.";
  const details = [
    ["Student ID", account.studentNumber ?? ""],
    ["Program", account.program || "Contact the Registrar"],
    ["Institute", theme.name],
  ];

  return {
    subject: account.reminder
      ? "Reminder: Activate your CdM LMS account"
      : "Activate your CdM LMS account",
    text: `Hello ${account.name},\n\n${heading}\nSet your password to activate your CdM LMS account.\n${details.map(([label, value]) => `${label}: ${value}`).join("\n")}\n\nSet your password: ${account.link}\n\nThis link expires in 72 hours. If you did not expect this invitation, contact the Office of the Registrar.`,
    html: `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Activate your CdM LMS account</title></head>
<body style="margin:0;padding:0;background-color:#F8FAFC;color:#0F172A;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Set your password and get started with CdM LMS. Your activation link is valid for 72 hours.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F8FAFC;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:560px;">
        <tr><td style="padding:0 8px 24px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
            <td align="center" width="48" height="48" bgcolor="${accent}" style="border-radius:12px;color:${ink};font-size:16px;font-weight:700;">CdM</td>
            <td style="padding-left:12px;"><div style="font-size:20px;line-height:26px;font-weight:700;letter-spacing:-0.5px;">CdM LMS</div><div style="font-size:12px;line-height:18px;color:#475569;">${escapeHtml(theme.name)}</div></td>
          </tr></table>
        </td></tr>
        <tr><td bgcolor="#FFFFFF" style="padding:32px 28px;border:1px solid #E2E8F0;border-radius:16px;">
          <h1 style="margin:0 0 24px;font-size:28px;line-height:35px;font-weight:700;letter-spacing:-0.7px;">${heading}</h1>
          <p style="margin:0 0 10px;font-size:16px;line-height:25px;">Hello ${name},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:25px;color:#475569;">${account.reminder ? "A quick reminder to finish setting up your account." : "Welcome to CdM LMS."} Create your password to access your classes, learning materials, and campus updates.</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top:1px solid #E2E8F0;border-bottom:1px solid #E2E8F0;">
            ${details.map(([label, value]) => `<tr><td width="92" valign="top" style="padding:12px 12px 12px 0;font-size:13px;line-height:21px;color:#475569;">${label}</td><td valign="top" style="padding:12px 0;font-size:14px;line-height:21px;font-weight:600;overflow-wrap:anywhere;">${escapeHtml(value)}</td></tr>`).join("")}
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;"><tr><td align="center" bgcolor="${accent}" style="border-radius:10px;mso-padding-alt:16px 24px;"><a href="${link}" style="display:block;padding:16px 24px;color:${ink};font-size:15px;line-height:20px;font-weight:700;text-align:center;text-decoration:none;border-radius:10px;">Activate My Account</a></td></tr></table>
          <p style="margin:16px 0 0;text-align:center;font-size:13px;line-height:20px;color:#475569;">This link expires in <strong>72 hours</strong>.</p>
          <p style="margin:28px 0 6px;font-size:12px;line-height:20px;color:#475569;">Button not opening? Copy this link into your browser:</p>
          <p style="margin:0;font-size:12px;line-height:20px;word-break:break-all;overflow-wrap:anywhere;"><a href="${link}" style="color:#334155;text-decoration:underline;word-break:break-all;">${link}</a></p>
        </td></tr>
        <tr><td style="padding:24px 12px 0;text-align:center;font-size:12px;line-height:20px;color:#475569;">If you did not expect this invitation, contact the<br>Office of the Registrar.<br><span style="display:inline-block;margin-top:12px;font-weight:600;">CdM LMS</span> &middot; Your campus, connected.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

import sgMail    from "@sendgrid/mail";
import nodemailer from "nodemailer";
import fs         from "fs";
import path       from "path";

function getLogoBase64(): string | null {
  try {
    const buf = fs.readFileSync(path.join(process.cwd(), "public/assets/logo-white.png"));
    return buf.toString("base64");
  } catch {
    return null;
  }
}

export async function sendMail(opts: {
  to:           string;
  cc?:          string | string[];
  subject:      string;
  html:         string;
  attachments?: { filename: string; path: string }[];
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@pronuvia.com";

  // Normalise CC: remove blanks and duplicates of `to`
  const ccList = (Array.isArray(opts.cc) ? opts.cc : opts.cc ? [opts.cc] : [])
    .map(e => e.trim())
    .filter(e => e && e !== opts.to);
  const ccUnique = [...new Set(ccList)];

  // ── SendGrid (preferred — works on Vercel / serverless) ───────────────────
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const logoB64 = getLogoBase64();
    const [res] = await sgMail.send({
      to:      opts.to,
      from,
      subject: opts.subject,
      html:    opts.html,
      text:    "",
      ...(ccUnique.length ? { cc: ccUnique } : {}),
      ...(logoB64 ? {
        attachments: [{
          content:     logoB64,
          filename:    "logo-white.png",
          type:        "image/png",
          disposition: "inline",
          contentId:   "pronuvia-logo",
        }],
      } : {}),
    });
    console.log("[mailer/sendgrid] sent to", opts.to, ccUnique.length ? `| cc: ${ccUnique.join(", ")}` : "", "| subject:", opts.subject, "| status:", res.statusCode);
    return res;
  }

  // ── Nodemailer SMTP fallback (local dev) ──────────────────────────────────
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("No email provider configured. Set SENDGRID_API_KEY or SMTP_USER/SMTP_PASS.");
  }

  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST ?? "smtp.gmail.com",
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const logoB64 = getLogoBase64();
  const logoAttachment = logoB64 ? [{
    filename: "logo-white.png",
    content:  Buffer.from(logoB64, "base64"),
    cid:      "pronuvia-logo",
  }] : [];

  const info = await transporter.sendMail({
    from,
    to:          opts.to,
    cc:          ccUnique.length ? ccUnique.join(", ") : undefined,
    subject:     opts.subject,
    html:        opts.html,
    attachments: [...logoAttachment, ...(opts.attachments ?? [])],
  });
  console.log("[mailer/smtp] sent to", opts.to, ccUnique.length ? `| cc: ${ccUnique.join(", ")}` : "", "| subject:", opts.subject, "| msgId:", info.messageId);
  return info;
}

import sgMail   from "@sendgrid/mail";
import nodemailer from "nodemailer";

export async function sendMail(opts: {
  to:           string;
  cc?:          string;
  subject:      string;
  html:         string;
  attachments?: { filename: string; path: string }[];
}) {
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "noreply@pronuvia.com";

  // ── SendGrid (preferred — works on Vercel / serverless) ───────────────────
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg: Parameters<typeof sgMail.send>[0] = {
      to:      opts.to,
      from,
      subject: opts.subject,
      html:    opts.html,
    };
    if (opts.cc) msg.cc = opts.cc;

    const [res] = await sgMail.send(msg);
    console.log("[mailer/sendgrid] sent to", opts.to, opts.cc ? `| cc: ${opts.cc}` : "", "| subject:", opts.subject, "| status:", res.statusCode);
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

  const info = await transporter.sendMail({
    from,
    to:          opts.to,
    cc:          opts.cc,
    subject:     opts.subject,
    html:        opts.html,
    attachments: opts.attachments,
  });
  console.log("[mailer/smtp] sent to", opts.to, opts.cc ? `| cc: ${opts.cc}` : "", "| subject:", opts.subject, "| msgId:", info.messageId);
  return info;
}

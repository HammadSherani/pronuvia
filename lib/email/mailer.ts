import nodemailer from "nodemailer";

function createTransporter() {
  const host = process.env.SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT ?? 587);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error("SMTP_USER and SMTP_PASS must be set in environment variables.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendMail(opts: {
  to:           string;
  cc?:          string;
  subject:      string;
  html:         string;
  attachments?: { filename: string; path: string }[];
}) {
  const transporter = createTransporter();
  const info = await transporter.sendMail({
    from:        process.env.SMTP_FROM ?? process.env.SMTP_USER,
    to:          opts.to,
    cc:          opts.cc,
    subject:     opts.subject,
    html:        opts.html,
    attachments: opts.attachments,
  });
  console.log("[mailer] sent to", opts.to, opts.cc ? `| cc: ${opts.cc}` : "", "| subject:", opts.subject, "| msgId:", info.messageId);
  return info;
}

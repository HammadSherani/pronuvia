import sgMail    from "@sendgrid/mail";
import nodemailer from "nodemailer";
import fs         from "fs";
import path       from "path";

// Parse "Name <email@x.com>" or plain "email@x.com" into { name?, email }
function parseFromAddress(raw: string): { email: string; name?: string } {
  const match = raw.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (match) {
    const name  = match[1].trim().replace(/^["']|["']$/g, "");
    const email = match[2].trim();
    return name ? { name, email } : { email };
  }
  return { email: raw.trim() };
}

export type MailAttachment = { filename: string; path?: string; content?: Buffer; type?: string };

export async function sendMail(opts: {
  to:           string;
  cc?:          string | string[];
  bcc?:         string | string[];
  subject:      string;
  html:         string;
  attachments?: MailAttachment[];
}) {
  const rawFrom = process.env.SMTP_FROM ?? process.env.SMTP_USER ?? "sales1.pronuvia@gmail.com";

  // Normalise CC: remove blanks and duplicates of `to`
  const ccList = (Array.isArray(opts.cc) ? opts.cc : opts.cc ? [opts.cc] : [])
    .map(e => e.trim())
    .filter(e => e && e !== opts.to);
  const ccUnique = [...new Set(ccList)];

  // Normalise BCC: remove blanks and duplicates of `to` and `cc`
  const bccList = (Array.isArray(opts.bcc) ? opts.bcc : opts.bcc ? [opts.bcc] : [])
    .map(e => e.trim())
    .filter(e => e && e !== opts.to && !ccUnique.includes(e));
  const bccUnique = [...new Set(bccList)];

  // ── SendGrid (preferred — works on Vercel / serverless) ───────────────────
  if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const from    = parseFromAddress(rawFrom);

    // SendGrid doesn't support CID inline attachments reliably — swap to public URL
    const appUrl  = (process.env.NEXT_PUBLIC_APP_URL ?? "https://pronuvia.vercel.app").replace(/\/$/, "");
    const logoUrl = `${appUrl}/assets/logo.png`;
    const html    = opts.html.replace(/cid:pronuvia-logo/g, logoUrl);

    try {
      // Convert Buffer attachments to base64 for SendGrid
      const sgAttachments = (opts.attachments ?? [])
        .filter((a) => a.content !== undefined)
        .map((a) => ({
          filename:    a.filename,
          content:     a.content!.toString("base64"),
          type:        a.type ?? "application/octet-stream",
          disposition: "attachment" as const,
        }));

      const [res] = await sgMail.send({
        to:      opts.to,
        from,
        subject: opts.subject,
        html,
        ...(ccUnique.length       ? { cc:          ccUnique       } : {}),
        ...(bccUnique.length      ? { bcc:         bccUnique      } : {}),
        ...(sgAttachments.length  ? { attachments: sgAttachments  } : {}),
      });
      console.log("[mailer/sendgrid] sent to", opts.to, "| subject:", opts.subject, "| status:", res.statusCode);
      return res;
    } catch (err: unknown) {
      const sgErr = err as { code?: number; response?: { body?: unknown } };
      console.error("[mailer/sendgrid] FAILED — code:", sgErr.code, "| body:", JSON.stringify(sgErr.response?.body));

      // Fall through to SMTP for: 403 (unverified sender), DNS failures, network errors.
      const isNetworkError = typeof sgErr.code === "string" && ["EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(sgErr.code);
      if (!isNetworkError && sgErr.code !== 403) throw err;
      console.warn(`[mailer/sendgrid] falling back to SMTP (reason: ${sgErr.code ?? "unknown"})`);
    }
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

  // Build CID logo attachment (inline, so Gmail renders it inside the email body)
  const logoBuf = (() => {
    try { return fs.readFileSync(path.join(process.cwd(), "public/assets/logo.png")); }
    catch { return null; }
  })();
  const logoAttachments = logoBuf ? [{
    filename:           "logo.png",
    content:            logoBuf,
    cid:                "pronuvia-logo",
    contentDisposition: "inline" as const,
  }] : [];

  const info = await transporter.sendMail({
    from:        rawFrom,
    to:          opts.to,
    cc:          ccUnique.length  ? ccUnique.join(", ")  : undefined,
    bcc:         bccUnique.length ? bccUnique.join(", ") : undefined,
    subject:     opts.subject,
    html:        opts.html,
    attachments: [...logoAttachments, ...(opts.attachments ?? [])],
  });
  console.log("[mailer/smtp] sent to", opts.to, ccUnique.length ? `| cc: ${ccUnique.join(", ")}` : "", bccUnique.length ? `| bcc: ${bccUnique.join(", ")}` : "", "| subject:", opts.subject, "| msgId:", info.messageId);
  return info;
}

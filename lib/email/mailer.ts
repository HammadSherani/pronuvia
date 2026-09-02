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
  const replyTo = "sales1.pronuvia@gmail.com";

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

  // Resolve path-based attachments (e.g. static PDFs shipped in the repo)
  // into in-memory content up front. SendGrid's API has no concept of "read
  // this file off disk" — it only accepts base64 content — so a path-only
  // attachment was previously silently dropped on the SendGrid send path
  // (nodemailer/SMTP does support `path` directly, which is why this only
  // showed up once SendGrid became the primary provider). A read failure
  // logs and skips that one attachment rather than failing the whole email.
  const resolvedAttachments: MailAttachment[] = (opts.attachments ?? []).flatMap((a) => {
    if (a.content !== undefined || !a.path) return [a];
    try {
      return [{ ...a, content: fs.readFileSync(a.path) }];
    } catch (err) {
      console.error(`[mailer] could not read attachment "${a.filename}" at ${a.path}:`, err);
      return [];
    }
  });

  // SendGrid rejects the whole request over ~30MB (base64 attachments +
  // headers + HTML body included). Rather than risk the entire email
  // silently failing to send over one oversized PDF, drop the largest
  // attachments first until the set comfortably fits — the email still
  // goes out with whatever attachments remain.
  const MAX_ATTACHMENTS_BYTES = 20 * 1024 * 1024; // ~20MB raw ≈ ~27MB base64, leaves headroom under the 30MB cap
  let attachmentBytes = resolvedAttachments.reduce((sum, a) => sum + (a.content?.length ?? 0), 0);
  if (attachmentBytes > MAX_ATTACHMENTS_BYTES) {
    resolvedAttachments.sort((a, b) => (b.content?.length ?? 0) - (a.content?.length ?? 0));
    while (attachmentBytes > MAX_ATTACHMENTS_BYTES && resolvedAttachments.length) {
      const dropped = resolvedAttachments.shift()!;
      const droppedBytes = dropped.content?.length ?? 0;
      attachmentBytes -= droppedBytes;
      console.warn(`[mailer] dropping oversized attachment "${dropped.filename}" (${(droppedBytes / 1024 / 1024).toFixed(1)}MB) to stay under the email size limit`);
    }
  }

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
      const sgAttachments = resolvedAttachments
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
        replyTo,
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

      // Fall through to SMTP for: 401 (credits exceeded / key revoked), 403 (unverified
      // sender), DNS failures, network errors.
      const isNetworkError = typeof sgErr.code === "string" && ["EAI_AGAIN", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND"].includes(sgErr.code);
      if (!isNetworkError && sgErr.code !== 403 && sgErr.code !== 401) throw err;
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
    replyTo,
    to:          opts.to,
    cc:          ccUnique.length  ? ccUnique.join(", ")  : undefined,
    bcc:         bccUnique.length ? bccUnique.join(", ") : undefined,
    subject:     opts.subject,
    html:        opts.html,
    attachments: [...logoAttachments, ...resolvedAttachments],
  });
  console.log("[mailer/smtp] sent to", opts.to, ccUnique.length ? `| cc: ${ccUnique.join(", ")}` : "", bccUnique.length ? `| bcc: ${bccUnique.join(", ")}` : "", "| subject:", opts.subject, "| msgId:", info.messageId);
  return info;
}

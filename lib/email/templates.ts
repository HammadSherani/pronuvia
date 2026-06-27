const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const base = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pronuvia</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Logo / Brand -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="display:inline-block;background:#3DBFA4;border-radius:12px;padding:10px 22px;">
                <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">Pronuvia</span>
              </div>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#fff;border-radius:16px;padding:40px 40px 32px;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This email was sent by Pronuvia Partner Portal.
                Please do not reply to this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

// ─────────────────────────────────────────────
// Password setup email (new accounts — sales rep or physician)
// ─────────────────────────────────────────────
export function passwordSetupEmail(opts: {
  firstName: string;
  email: string;
  resetToken: string;
  role: "salesRep" | "physician";
}) {
  const resetLink = `${APP_URL}/reset-password/${opts.resetToken}`;
  const roleLabel = opts.role === "salesRep" ? "Sales Representative" : "Partnering Physician";
  const subject = "Welcome to Pronuvia — Set Your Password";
  const html = base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Welcome, ${opts.firstName}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Your Pronuvia ${roleLabel} account has been created.
      Click the button below to set your password and activate your account.
    </p>

    <!-- Email box -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Your Login Email</p>
      <p style="margin:8px 0 0;font-size:14px;font-weight:600;color:#111827;">${opts.email}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${resetLink}"
        style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:8px;">
        Set My Password
      </a>
    </div>

    <p style="margin:0 0 12px;font-size:13px;color:#9ca3af;line-height:1.6;">
      This link will expire in <strong style="color:#6b7280;">72 hours</strong>.
      If you did not expect this email, please ignore it.
    </p>
    <p style="margin:0;font-size:12px;color:#d1d5db;word-break:break-all;">
      ${resetLink}
    </p>
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Physician approval welcome email (detailed onboarding)
// ─────────────────────────────────────────────
export function physicianApprovalEmail(opts: {
  firstName: string;
  lastName:  string;
  email:     string;
  resetToken: string;
}) {
  const resetLink = `${APP_URL}/reset-password/${opts.resetToken}`;
  const subject   = "Welcome to Pronuvia — Your Account is Approved";

  const row = (label: string, value: string) =>
    `<tr>
      <td style="padding:7px 0;font-size:13px;color:#6b7280;white-space:nowrap;vertical-align:top;width:160px;">${label}</td>
      <td style="padding:7px 0 7px 12px;font-size:13px;color:#111827;font-weight:600;word-break:break-all;">${value}</td>
    </tr>`;

  const h2 = (t: string) =>
    `<p style="margin:24px 0 6px;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#3DBFA4;">${t}</p>`;

  const html = base(`
    <p style="margin:0 0 6px;font-size:15px;color:#111827;line-height:1.6;">Dear Dr. ${opts.firstName} ${opts.lastName},</p>
    <p style="margin:0 0 18px;font-size:14px;color:#374151;line-height:1.7;">
      I am Jason from Pronuvia and am glad to welcome you as a participating physician for AIC Therapy.
    </p>
    <p style="margin:0 0 18px;font-size:14px;color:#374151;line-height:1.7;">
      Your application to set up an account with us is now <strong>approved</strong>. Congratulations.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      We also sent you a Welcome Aboard email with links and information on AIC Therapy for your study and reference.
      If you did not receive it yet, please check your email's Promotion or Spam folder to locate it.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      I am certain that you are excited to try out our new ionic calcium therapy for your patients, and we are equally
      excited to come alongside to provide all the needed support. However, let's get all the required legal documentation
      taken care of first so that we can move forward with full steam.
    </p>

    ${h2("Login Info")}
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:16px 20px;margin-bottom:6px;">
      <table cellpadding="0" cellspacing="0" style="width:100%;">
        ${row("Website:", "www.pronuvia.com")}
        ${row("Username (Login ID):", opts.email)}
        ${row("Email:", opts.email)}
        ${row("Password:", "Click &ldquo;Forgot Your Password?&rdquo; to set your password")}
      </table>
    </div>
    <div style="text-align:center;margin:16px 0 24px;">
      <a href="${resetLink}" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
        Set My Password
      </a>
    </div>

    ${h2("B2B Order Process")}
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      Your office needs to enter the order through our website after login at <strong>www.pronuvia.com</strong> (not www.AICtherapy.com).
    </p>
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      After login, please go to <strong>"Account Manager"</strong> and click <strong>"Order Products"</strong> on the menu.
    </p>
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      You can put the shipping address and credit card info of your patient if you want so that we can support the drop ship to your patient.
    </p>
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      Please enter patient's email address when you order so that they can receive shipment tracking number.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      You will receive the order confirmation email automatically as cc.
    </p>

    ${h2("Agreement")}
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      We attached the Terms and Conditions you agreed during the application process.
    </p>

    ${h2("Free Consultation")}
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      To help new doctors get started, we provide a 30-minute personal free consultation. You and your staff or anyone
      in the practice who needs the basic introduction to AIC Therapy can join. During the call, we can answer any
      questions that you may have.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      You can book a free consultation at:<br/>
      <a href="https://www.aictherapy.com/book-a-consultation" style="color:#3DBFA4;">https://www.aictherapy.com/book-a-consultation</a>
    </p>

    ${h2("The Scope of Practice")}
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      We ask approved doctors and health practitioners to limit the use of AIC (Anti-orbital Ionic Calcium) therapy
      within the legally allowed scope of the license in treating patients. For example, for nutritionists, AIC therapy
      can be utilized to treat ionic calcium deficiency, to restore calcium homeostasis, to boost the immune system,
      to balance the body pH, and for other general calcium-related health issues from a nutritional therapy point of view.
    </p>

    ${h2("Commission Payout")}
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      We will send you 25% of the commission in the first week of each month. Please provide the information for one of
      the following payout options (we suggest ACH as it is safer and faster):
    </p>
    <p style="margin:0 0 4px;font-size:13px;color:#111827;font-weight:600;">(1) ACH</p>
    <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.7;">Bank Name · Bank Routing Number · Account Number · Account Type (Checking or Savings) · Name on the Account</p>
    <p style="margin:0 0 4px;font-size:13px;color:#111827;font-weight:600;">(2) Check</p>
    <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.7;">Provide name for "Payable to" and mailing address.</p>
    <p style="margin:0 0 4px;font-size:13px;color:#111827;font-weight:600;">(3) Zelle, Venmo, or PayPal</p>
    <p style="margin:0 0 24px;font-size:13px;color:#374151;line-height:1.7;">
      Zelle: email or phone number · Venmo: username or email · PayPal: email address
    </p>

    ${h2("W-9 Form")}
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      We sent an email via QuickBooks to you for W-9 now. Please fill out the W-9 form within 24 hours as the link
      will become inactive. The email subject is <em>"Fill out your W-9 tax info for Pronuvia, Inc."</em>
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      Alternatively, you may fill out the attached W-9 form with your signature and send us back the scanned file.
    </p>

    ${h2("AIC Therapy Booklet and Dosing Protocol")}
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      Please read through the attached Pronuvia AIC Therapy Booklet and Dosing Protocol files. Not only the dosing
      protocol, but it will also provide a fundamental guideline for the doctor's practice.
    </p>

    ${h2("Website Content Policy for Pronuvia Products")}
    <p style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.7;">
      We suggest doctors market AIC as a therapy under a generic treatment name (e.g. AIC calcium therapy or ionic
      calcium therapy) instead of marketing branded products directly.
    </p>
    <p style="margin:0 0 4px;font-size:13px;color:#374151;line-height:1.7;">• Please do not list our company name (Pronuvia) and product information searchable on Google on your website.</p>
    <p style="margin:0 0 4px;font-size:13px;color:#374151;line-height:1.7;">• Please provide a doctor's phone number or email for consultations. All orders should be offline by phone.</p>
    <p style="margin:0 0 4px;font-size:13px;color:#374151;line-height:1.7;">• Recommended treatment names: "AIC Therapy," "AIC Ionic Calcium Treatment," "Ionic Calcium Treatment," "Calcium Ion Treatment."</p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">
      Please note that the 30-min free consultation is a very important and useful session to understand our products.
    </p>

    <p style="margin:0 0 6px;font-size:14px;color:#374151;line-height:1.7;">
      If you have any questions, please contact us at <strong>800-568-2982</strong> or
      <a href="mailto:contact@pronuvia.com" style="color:#3DBFA4;">contact@pronuvia.com</a>.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#374151;line-height:1.7;">Thank you.<br/><br/>Sincerely,<br/><strong>Jason Park</strong><br/>Pronuvia Physician Support</p>

    <div style="border-top:1px solid #e5e7eb;margin-top:24px;padding-top:20px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;letter-spacing:0.06em;text-transform:uppercase;">Disclaimer</p>
      <p style="margin:0;font-size:11px;color:#9ca3af;line-height:1.7;">
        Pronuvia thanks participating doctors, clinics, and health care practitioners for making AIC therapy available
        to consenting patients. Please note that Pronuvia hereby makes no medical claims to treat or cure any diseases.
        AIC products are registered as dietary supplements. AIC therapy is a nutritional therapy based on ionic calcium.
        Utilizing physiological reactions in treating diseases is solely at the discretion of participating physicians.
        Pronuvia distributes AIC applied products only through licensed physicians, clinics, and health care practitioners.
        Pronuvia, as a company, does not treat patients directly nor offer any health advice.
      </p>
    </div>
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Sales rep welcome email (kept for compatibility)
// ─────────────────────────────────────────────
export function salesRepWelcomeEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  const subject = "Welcome to Pronuvia — Your Account is Ready";
  const html = base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Welcome, ${opts.firstName}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Your Pronuvia Sales Representative account has been created.
      You can now log in and start managing your partnering physicians.
    </p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Your Login Credentials</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:110px;">Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${opts.email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Password</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;font-family:monospace;">${opts.password}</td>
        </tr>
      </table>
    </div>
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${APP_URL}/login"
        style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
        Log In to Your Account
      </a>
    </div>
    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
      For security, please change your password after your first login.
    </p>
  `);
  return { subject, html };
}

// ─────────────────────────────────────────────
// Physician welcome email (admin-created, auto-approved)
// ─────────────────────────────────────────────
export function physicianWelcomeEmail(opts: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  nameOfPractice?: string | null;
}) {
  const subject = "Welcome to Pronuvia — Your Physician Account is Ready";
  const html = base(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      Welcome, Dr. ${opts.firstName} ${opts.lastName}!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Your Pronuvia Partnering Physician account has been created and
      <strong style="color:#3DBFA4;">approved</strong>.
      You can log in immediately and start placing orders.
    </p>

    ${opts.nameOfPractice ? `
    <p style="margin:-12px 0 24px;font-size:14px;color:#6b7280;">
      Practice: <strong style="color:#111827;">${opts.nameOfPractice}</strong>
    </p>` : ""}

    <!-- Credentials box -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Your Login Credentials</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:110px;">Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${opts.email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Password</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;font-family:monospace;">${opts.password}</td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${APP_URL}/login"
        style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
        Log In to Your Account
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
      For security, please change your password after your first login.
      If you have any questions, contact your sales representative or administrator.
    </p>
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────
// Sales rep notification — new physician assigned to them
// ─────────────────────────────────────────────
export function salesRepPhysicianAssignedEmail(opts: {
  salesRepFirstName: string;
  physicianFirstName: string;
  physicianLastName: string;
  physicianEmail: string;
  nameOfPractice?: string | null;
}) {
  const subject = `Great news! Dr. ${opts.physicianFirstName} ${opts.physicianLastName} has joined through your referral`;
  const html = base(`
    <!-- Green badge -->
    <div style="display:inline-block;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:8px;padding:6px 14px;margin-bottom:20px;">
      <span style="color:#059669;font-size:13px;font-weight:600;">&#10003; New Referral Added</span>
    </div>

    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
      A doctor joined through your referral!
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
      Hi ${opts.salesRepFirstName}, great news!
      The administrator has added <strong style="color:#111827;">Dr. ${opts.physicianFirstName} ${opts.physicianLastName}</strong>
      to Pronuvia under your account. Their account is already active and approved.
    </p>

    <!-- Physician info box -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 24px;margin-bottom:28px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">Physician Details</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:130px;">Name</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">
            Dr. ${opts.physicianFirstName} ${opts.physicianLastName}
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${opts.physicianEmail}</td>
        </tr>
        ${opts.nameOfPractice ? `
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Practice</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${opts.nameOfPractice}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Status</td>
          <td style="padding:6px 0;">
            <span style="background:#ecfdf5;color:#059669;font-size:12px;font-weight:600;padding:2px 10px;border-radius:20px;border:1px solid #6ee7b7;">
              Approved &amp; Active
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:28px;">
      <a href="${APP_URL}/sales/physicians"
        style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">
        View My Physicians
      </a>
    </div>

    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
      Any orders placed by this physician will count towards your commission.
      Log in to your dashboard to stay updated.
    </p>
  `);

  return { subject, html };
}

// ─────────────────────────────────────────────
// Order email templates (admin → physician)
// ─────────────────────────────────────────────
type OrderItem = {
  title: string; variantSize?: string;
  quantity: number; unitPrice: number; lineTotal: number;
};

function orderItemsTable(items: OrderItem[]) {
  const rows = items.map((i) => `
    <tr>
      <td style="padding:10px 0;font-size:13px;color:#111827;border-bottom:1px solid #f3f4f6;">
        ${i.title}${i.variantSize ? ` <span style="color:#6b7280;">(${i.variantSize})</span>` : ""}
      </td>
      <td style="padding:10px 0;font-size:13px;color:#6b7280;text-align:center;border-bottom:1px solid #f3f4f6;">${i.quantity}</td>
      <td style="padding:10px 0;font-size:13px;color:#6b7280;text-align:right;border-bottom:1px solid #f3f4f6;">$${i.unitPrice.toFixed(2)}</td>
      <td style="padding:10px 0;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #f3f4f6;">$${i.lineTotal.toFixed(2)}</td>
    </tr>`).join("");
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <thead><tr>
        <th style="padding:0 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;text-align:left;">Product</th>
        <th style="padding:0 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;text-align:center;">Qty</th>
        <th style="padding:0 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;text-align:right;">Unit</th>
        <th style="padding:0 0 8px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;text-align:right;">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export type OrderEmailData = {
  orderNumber:       string;
  firstName:         string;
  total:             number;
  status:            string;
  items:             OrderItem[];
  trackingNumber?:   string | null;
  shippingCarrier?:  string | null;
  estimatedDelivery?: Date | null;
};

export function orderConfirmationEmail(d: OrderEmailData) {
  return {
    subject: `Order Confirmed: ${d.orderNumber}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Confirmed!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi Dr. ${d.firstName}, thank you for your order. We've received it and will start processing shortly.
      </p>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">Order #${d.orderNumber} · Total: $${d.total.toFixed(2)}</p>
      </div>
      ${orderItemsTable(d.items)}
      <div style="text-align:center;">
        <a href="${APP_URL}/physician/orders" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">View My Orders</a>
      </div>`),
  };
}

export function orderProcessingEmail(d: OrderEmailData) {
  return {
    subject: `Your order ${d.orderNumber} is being processed`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order In Progress</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi Dr. ${d.firstName}, your order <strong>${d.orderNumber}</strong> is being processed and prepared for shipment.
      </p>
      ${orderItemsTable(d.items)}
      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#1d4ed8;font-weight:600;">We'll notify you once your order ships.</p>
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/physician/orders" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">Track My Order</a>
      </div>`),
  };
}

export function orderCompletedEmail(d: OrderEmailData) {
  return {
    subject: `Order ${d.orderNumber} Completed — Thank You!`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Completed!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi Dr. ${d.firstName}, your order <strong>${d.orderNumber}</strong> has been completed. Thank you for your business!
      </p>
      ${orderItemsTable(d.items)}
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#15803d;font-weight:600;">Total paid: $${d.total.toFixed(2)}</p>
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/physician/orders" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">View Order History</a>
      </div>`),
  };
}

export function orderCancelledEmail(d: OrderEmailData) {
  return {
    subject: `Order ${d.orderNumber} Cancelled`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Cancelled</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi Dr. ${d.firstName}, your order <strong>${d.orderNumber}</strong> has been cancelled.
        If you believe this is an error, please contact your administrator.
      </p>
      ${orderItemsTable(d.items)}
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:13px;color:#dc2626;font-weight:600;">For questions, please contact support.</p>
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/physician/orders" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">View My Orders</a>
      </div>`),
  };
}

export function orderDetailsEmail(d: OrderEmailData) {
  return {
    subject: `Order Details: ${d.orderNumber}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Order Details</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi Dr. ${d.firstName}, here are the details for your order <strong>${d.orderNumber}</strong>.
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 20px;margin-bottom:24px;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280;width:140px;">Order</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${d.orderNumber}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Status</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${d.status.charAt(0) + d.status.slice(1).toLowerCase()}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Total</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">$${d.total.toFixed(2)}</td>
          </tr>
          ${d.trackingNumber ? `
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Tracking</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${d.shippingCarrier ?? ""} ${d.trackingNumber}</td>
          </tr>` : ""}
          ${d.estimatedDelivery ? `
          <tr>
            <td style="padding:4px 0;font-size:13px;color:#6b7280;">Est. Delivery</td>
            <td style="padding:4px 0;font-size:13px;font-weight:600;color:#111827;">${new Date(d.estimatedDelivery).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"})}</td>
          </tr>` : ""}
        </table>
      </div>
      ${orderItemsTable(d.items)}
      <div style="text-align:center;">
        <a href="${APP_URL}/physician/orders" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">View My Orders</a>
      </div>`),
  };
}

export function forgotPasswordEmail(opts: { firstName: string; resetLink: string }) {
  return {
    subject: "Reset Your Pronuvia Password",
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Reset your password</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi ${opts.firstName}, we received a request to reset your Pronuvia password. Click the button below to choose a new one.
      </p>
      <div style="text-align:center;margin-bottom:28px;">
        <a href="${opts.resetLink}" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:13px 36px;border-radius:8px;">Reset Password</a>
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center;">
        This link will expire in <strong>1 hour</strong>.
      </p>
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        If you didn&apos;t request a password reset, you can safely ignore this email.
      </p>`),
  };
}

export function orderNoteEmail(opts: { firstName: string; orderNumber: string; note: string }) {
  return {
    subject: `Message regarding your order ${opts.orderNumber}`,
    html: base(`
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">A note about your order</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
        Hi Dr. ${opts.firstName}, the Pronuvia team has left a message regarding your order <strong>${opts.orderNumber}</strong>.
      </p>
      <div style="background:#f9fafb;border-left:4px solid #3DBFA4;border-radius:0 8px 8px 0;padding:16px 20px;margin-bottom:28px;">
        <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap;">${opts.note}</p>
      </div>
      <div style="text-align:center;">
        <a href="${APP_URL}/physician/orders" style="display:inline-block;background:#3DBFA4;color:#fff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:8px;">View My Orders</a>
      </div>
      <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
        If you have questions, please contact your administrator.
      </p>`),
  };
}

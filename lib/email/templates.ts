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

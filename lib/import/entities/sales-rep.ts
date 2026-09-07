import "server-only";
import { prisma } from "@/lib/db/prisma";
import { duplicateKeyField } from "@/lib/db/prisma-errors";
import { hashPassword } from "@/lib/auth/password";
import { generateResetToken, randomPlaceholderPassword } from "@/lib/auth/reset-token";
import { sendMail } from "@/lib/email/mailer";
import { passwordSetupEmail } from "@/lib/email/templates";
import { str, num, date } from "@/lib/import/coerce";
import { ImportSalesRepSchema } from "@/lib/import/schemas";
import type { RowResult } from "@/lib/import/types";
import type { EntityHandlerCtx } from "@/actions/admin/bulk-import";

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: EntityHandlerCtx,
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const seenEmails = new Map<string, number>();
  const seenLoginIds = new Map<string, number>();
  const sendEmails = ctx.sendEmails ?? false;

  for (const { row, mapped } of rows) {
    const parsed = ImportSalesRepSchema.safeParse({
      firstName: str(mapped.firstName),
      lastName: str(mapped.lastName),
      email: str(mapped.email),
      loginId: str(mapped.loginId),
      phone: str(mapped.phone),
      commission: num(mapped.commission) ?? 0,
      walletBalance: num(mapped.walletBalance) ?? 0,
      billingAddress: str(mapped.billingAddress),
      shippingAddress: str(mapped.shippingAddress),
      bankName: str(mapped.bankName),
      bankAccountNumber: str(mapped.bankAccountNumber),
      bankAccountName: str(mapped.bankAccountName),
      swiftCode: str(mapped.swiftCode),
      routingNumber: str(mapped.routingNumber),
      createdAt: date(mapped.createdAt),
    });
    if (!parsed.success) {
      results.push({ row, status: "error", errors: parsed.error.issues.map((i) => i.message) });
      continue;
    }

    const data = parsed.data;
    const preview = { firstName: data.firstName, lastName: data.lastName, email: data.email, loginId: data.loginId ?? "", walletBalance: data.walletBalance };
    const errors: string[] = [];

    if (ctx.indexes.repIdByEmail.has(data.email)) errors.push(`A sales rep with email "${data.email}" already exists.`);
    else if (seenEmails.has(data.email)) errors.push(`Duplicate of row ${seenEmails.get(data.email)} in this file (email).`);

    if (data.loginId) {
      if (ctx.indexes.takenLoginIds.has(data.loginId)) errors.push(`Login ID "${data.loginId}" is already in use.`);
      else if (seenLoginIds.has(data.loginId)) errors.push(`Duplicate of row ${seenLoginIds.get(data.loginId)} in this file (Login ID).`);
    }

    if (errors.length) {
      results.push({ row, status: "error", errors, preview });
      continue;
    }

    seenEmails.set(data.email, row);
    if (data.loginId) seenLoginIds.set(data.loginId, row);

    if (!ctx.commit) {
      results.push({ row, status: "ok", preview });
      continue;
    }

    const placeholder = randomPlaceholderPassword();
    const hashed = await hashPassword(placeholder);
    const { token, expiry } = sendEmails ? generateResetToken() : { token: null, expiry: null };

    try {
      const created = await prisma.salesRepresentative.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          name: `${data.firstName} ${data.lastName}`,
          email: data.email,
          loginId: data.loginId ?? null,
          phone: data.phone ?? null,
          commission: data.commission,
          walletBalance: data.walletBalance,
          billingAddress: data.billingAddress ?? null,
          shippingAddress: data.shippingAddress ?? null,
          bankName: data.bankName ?? null,
          bankAccountNumber: data.bankAccountNumber ?? null,
          bankAccountName: data.bankAccountName ?? null,
          swiftCode: data.swiftCode ?? null,
          routingNumber: data.routingNumber ?? null,
          password: hashed,
          passwordResetToken: token,
          passwordResetExpiry: expiry,
          ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        },
      });

      ctx.indexes.repIdByEmail.set(data.email, created.id);
      if (data.loginId) ctx.indexes.takenLoginIds.add(data.loginId);

      if (sendEmails && token) {
        try {
          const { subject, html } = passwordSetupEmail({
            firstName: `${data.firstName} ${data.lastName}`,
            email: data.email,
            resetToken: token,
            role: "salesRep",
          });
          await sendMail({ to: data.email, subject, html });
        } catch (err) {
          console.error("[bulk-import/sales-rep] setup email failed:", err);
        }
      }

      results.push({ row, status: "ok", preview });
    } catch (err) {
      const field = duplicateKeyField(err);
      results.push({ row, status: "error", errors: [field ? `Duplicate ${field}.` : "Failed to create sales rep."], preview });
    }
  }

  return results;
}

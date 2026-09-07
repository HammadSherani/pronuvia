import "server-only";
import { prisma } from "@/lib/db/prisma";
import { duplicateKeyField } from "@/lib/db/prisma-errors";
import { hashPassword } from "@/lib/auth/password";
import { generateResetToken, randomPlaceholderPassword } from "@/lib/auth/reset-token";
import { sendMail } from "@/lib/email/mailer";
import { physicianApprovalEmail, doctorRegistrationEmail } from "@/lib/email/templates";
import { Role, ApprovalStatus } from "@/generated/prisma/enums";
import { str, num, int, list, date } from "@/lib/import/coerce";
import { ImportPhysicianSchema } from "@/lib/import/schemas";
import { resolveCountry, resolveState } from "@/lib/import/address";
import type { RowResult } from "@/lib/import/types";
import type { EntityHandlerCtx } from "@/actions/admin/bulk-import";

export async function handle(
  rows: { row: number; mapped: Record<string, unknown> }[],
  ctx: EntityHandlerCtx,
): Promise<RowResult[]> {
  const results: RowResult[] = [];
  const seenEmails = new Map<string, number>();
  const seenLoginIds = new Map<string, number>();
  const seenLicenses = new Map<string, number>();
  const sendEmails = ctx.sendEmails ?? false;

  for (const { row, mapped } of rows) {
    const parsed = ImportPhysicianSchema.safeParse({
      firstName: str(mapped.firstName),
      lastName: str(mapped.lastName),
      email: str(mapped.email),
      loginId: str(mapped.loginId),
      phone: str(mapped.phone),
      officeContactNumber: str(mapped.officeContactNumber),
      fax: str(mapped.fax),
      nameOfPractice: str(mapped.nameOfPractice),
      websiteLink: str(mapped.websiteLink),
      license: str(mapped.license),
      aictherapy: str(mapped.aictherapy),
      fieldsOfSpeciality: list(mapped.fieldsOfSpeciality),
      yearsInPractice: int(mapped.yearsInPractice),
      addressOne: str(mapped.addressOne),
      addressTwo: str(mapped.addressTwo),
      city: str(mapped.city),
      state: str(mapped.state),
      zipCode: str(mapped.zipCode),
      country: str(mapped.country),
      isApproved: str(mapped.isApproved)?.toUpperCase(),
      commission: num(mapped.commission) ?? 0,
      uplineCommission: num(mapped.uplineCommission) ?? 0,
      salesRepEmail: str(mapped.salesRepEmail)?.toLowerCase(),
      walletBalance: num(mapped.walletBalance) ?? 0,
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
    const errors: string[] = [];

    const country = resolveCountry(data.country);
    if (!country) errors.push(`Country "${data.country}" not recognized.`);
    const state = country ? resolveState(data.state, country.code) : { code: data.state, name: data.state };

    let salesRepId: string | null = null;
    if (data.salesRepEmail) {
      salesRepId = ctx.indexes.repIdByEmail.get(data.salesRepEmail) ?? null;
      if (!salesRepId) errors.push(`Medical Rep "${data.salesRepEmail}" not found. Import Medical Reps first.`);
    }

    const preview = {
      firstName: data.firstName, lastName: data.lastName, email: data.email, loginId: data.loginId,
      country: country?.name ?? data.country, state: state.name || state.code,
      walletBalance: data.walletBalance, salesRepEmail: data.salesRepEmail ?? "",
    };

    if (ctx.indexes.physicianIdByEmail.has(data.email)) errors.push(`A physician with email "${data.email}" already exists.`);
    else if (seenEmails.has(data.email)) errors.push(`Duplicate of row ${seenEmails.get(data.email)} in this file (email).`);

    if (ctx.indexes.takenLoginIds.has(data.loginId)) errors.push(`Login ID "${data.loginId}" is already in use.`);
    else if (seenLoginIds.has(data.loginId)) errors.push(`Duplicate of row ${seenLoginIds.get(data.loginId)} in this file (Login ID).`);

    if (data.license) {
      if (ctx.indexes.takenLicenses.has(data.license)) errors.push(`License "${data.license}" is already registered.`);
      else if (seenLicenses.has(data.license)) errors.push(`Duplicate of row ${seenLicenses.get(data.license)} in this file (License).`);
    }

    if (errors.length) {
      results.push({ row, status: "error", errors, preview });
      continue;
    }

    seenEmails.set(data.email, row);
    seenLoginIds.set(data.loginId, row);
    if (data.license) seenLicenses.set(data.license, row);

    if (!ctx.commit) {
      results.push({ row, status: "ok", preview });
      continue;
    }

    const placeholder = randomPlaceholderPassword();
    const hashed = await hashPassword(placeholder);
    const approved = data.isApproved === "APPROVED";
    const { token, expiry } = sendEmails && approved ? generateResetToken() : { token: null, expiry: null };

    try {
      const created = await prisma.partneringPhysician.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          loginId: data.loginId,
          phone: data.phone ?? null,
          officeContactNumber: data.officeContactNumber ?? null,
          fax: data.fax ?? null,
          nameOfPractice: data.nameOfPractice ?? null,
          websiteLink: data.websiteLink ?? null,
          license: data.license ?? null,
          aictherapy: data.aictherapy ?? null,
          fieldsOfSpeciality: data.fieldsOfSpeciality,
          yearsInPractice: data.yearsInPractice,
          addressOne: data.addressOne ?? null,
          addressTwo: data.addressTwo ?? null,
          city: data.city ?? null,
          state: state.code || state.name || null,
          zipCode: data.zipCode ?? null,
          country: country?.code ?? data.country,
          isApproved: data.isApproved as ApprovalStatus,
          commission: data.commission,
          uplineCommission: data.uplineCommission,
          salesRepId,
          walletBalance: data.walletBalance,
          bankName: data.bankName ?? null,
          bankAccountNumber: data.bankAccountNumber ?? null,
          bankAccountName: data.bankAccountName ?? null,
          swiftCode: data.swiftCode ?? null,
          routingNumber: data.routingNumber ?? null,
          password: hashed,
          addedByRole: Role.ADMIN,
          addedByAdminId: ctx.adminId,
          passwordResetToken: token,
          passwordResetExpiry: expiry,
          ...(data.createdAt ? { createdAt: data.createdAt } : {}),
        },
      });

      ctx.indexes.physicianIdByEmail.set(data.email, {
        id: created.id, salesRepId, commission: data.commission, uplineCommission: data.uplineCommission,
      });
      ctx.indexes.takenLoginIds.add(data.loginId);
      if (data.license) ctx.indexes.takenLicenses.add(data.license);

      if (sendEmails) {
        try {
          if (approved && token) {
            const { subject, html } = physicianApprovalEmail({
              firstName: data.firstName, lastName: data.lastName, email: data.email,
              loginId: data.loginId, resetToken: token,
            });
            await sendMail({ to: data.email, subject, html });
          } else if (!approved) {
            const { subject, html } = doctorRegistrationEmail({ firstName: data.firstName, lastName: data.lastName });
            await sendMail({ to: data.email, subject, html });
          }
        } catch (err) {
          console.error("[bulk-import/physician] email failed:", err);
        }
      }

      results.push({ row, status: "ok", preview });
    } catch (err) {
      const field = duplicateKeyField(err);
      results.push({ row, status: "error", errors: [field ? `Duplicate ${field}.` : "Failed to create physician."], preview });
    }
  }

  return results;
}

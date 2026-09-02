"use server";

import { prisma }                       from "@/lib/db/prisma";
import { hashPassword }                 from "@/lib/auth/password";
import { randomPlaceholderPassword }    from "@/lib/auth/reset-token";
import { Role, ApprovalStatus }         from "@/generated/prisma/enums";
import { z }                            from "zod";
import { sendMail }                     from "@/lib/email/mailer";
import { doctorRegistrationEmail }      from "@/lib/email/templates";
import { LoginIdSchema } from "@/lib/validations/login-id";
import { isLoginIdTaken } from "@/lib/auth/physician-lookup";
import { duplicateKeyField } from "@/lib/db/prisma-errors";

const Schema = z.object({
  email:               z.string().email("Valid email is required"),
  loginId:             LoginIdSchema,
  firstName:           z.string().min(1, "First name is required"),
  lastName:            z.string().min(1, "Last name is required"),
  aictherapy:          z.string().min(1, "This field is required"),
  license:             z.string().min(1, "Doctor's license number is required"),
  websiteLink:         z.string().optional(),
  country:             z.string().min(1, "Country is required"),
  addressOne:          z.string().min(1, "Address is required"),
  addressTwo:          z.string().optional(),
  city:                z.string().min(1, "City is required"),
  state:               z.string().min(1, "State is required"),
  zipCode:             z.string().min(1, "Zip code is required"),
  phone:               z.string().min(1, "Phone is required"),
  officeContactNumber: z.string().min(1, "Office contact person is required"),
  fax:                 z.string().optional(),
  nameOfPractice:      z.string().min(1, "Name of practice is required"),
  yearsInPractice:     z.string()
    .min(1, "Years in practice is required")
    .transform((val, ctx) => {
      const n = Number(val);
      if (isNaN(n) || !Number.isInteger(n)) {
        ctx.addIssue({ code: "custom", message: "Must be a valid number" });
        return z.NEVER;
      }
      if (n < 0) {
        ctx.addIssue({ code: "custom", message: "Must be 0 or more" });
        return z.NEVER;
      }
      return n;
    }),
});

export type RegisterPhysicianState = {
  errors?:  Record<string, string[]>;
  message?: string;
  success?: boolean;
  values?:  Record<string, string>;
} | undefined;

export async function registerPhysician(
  _state: RegisterPhysicianState,
  formData: FormData
): Promise<RegisterPhysicianState> {
  const raw = {
    email:               (formData.get("email") as string)?.trim().toLowerCase(),
    loginId:             (formData.get("loginId") as string)?.trim(),
    firstName:           (formData.get("firstName") as string)?.trim(),
    lastName:            (formData.get("lastName") as string)?.trim(),
    aictherapy:          (formData.get("aictherapy") as string)?.trim(),
    license:             (formData.get("license") as string)?.trim(),
    websiteLink:         (formData.get("websiteLink") as string)?.trim(),
    country:             (formData.get("country") as string)?.trim(),
    addressOne:          (formData.get("addressOne") as string)?.trim(),
    addressTwo:          (formData.get("addressTwo") as string) || undefined,
    city:                (formData.get("city") as string)?.trim(),
    state:               (formData.get("state") as string)?.trim() ?? "",
    zipCode:             (formData.get("zipCode") as string)?.trim(),
    phone:               (formData.get("phone") as string)?.trim(),
    officeContactNumber: (formData.get("officeContactNumber") as string)?.trim(),
    fax:                 (formData.get("fax") as string)?.trim(),
    nameOfPractice:      (formData.get("nameOfPractice") as string)?.trim(),
    yearsInPractice:     (formData.get("yearsInPractice") as string) ?? "",
  };

  const strValues: Record<string, string> = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, String(v ?? "")])
  );

  const validated = Schema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors, values: strValues };
  }

  const specialtiesRaw = formData.get("fieldsOfSpeciality") as string;
  const fieldsOfSpeciality: string[] = specialtiesRaw ? JSON.parse(specialtiesRaw) : [];

  if (fieldsOfSpeciality.length === 0) {
    return { errors: { fieldsOfSpeciality: ["Please select at least one specialty"] }, values: strValues };
  }

  const exists = await prisma.partneringPhysician.findUnique({
    where: { email: validated.data.email },
  });
  if (exists) {
    return { errors: { email: ["An account with this email already exists."] }, values: strValues };
  }

  if (await isLoginIdTaken(validated.data.loginId)) {
    return { errors: { loginId: ["This Login ID is already in use."] }, values: strValues };
  }

  const licenseExists = await prisma.partneringPhysician.findFirst({
    where: { license: validated.data.license },
  });
  if (licenseExists) {
    return { errors: { license: ["This license number is already registered with another physician."] }, values: strValues };
  }

  const placeholder = randomPlaceholderPassword();
  const hashed      = await hashPassword(placeholder);

  try {
    await prisma.partneringPhysician.create({
      data: {
        ...validated.data,
        password:          hashed,
        fieldsOfSpeciality,
        isApproved:        ApprovalStatus.PENDING,
        addedByRole:       Role.PHYSICIAN,
        commission:        0,
        uplineCommission:  0,
      },
    });
  } catch (err) {
    const field = duplicateKeyField(err);
    if (field === "loginId") return { errors: { loginId: ["This Login ID is already in use."] }, values: strValues };
    if (field === "email")   return { errors: { email: ["An account with this email already exists."] }, values: strValues };
    throw err;
  }

  try {
    const { subject, html } = doctorRegistrationEmail({
      firstName: validated.data.firstName,
      lastName:  validated.data.lastName,
    });
    await sendMail({ to: validated.data.email, subject, html });
  } catch (err) {
    console.error("[email] signup confirmation FAILED for", validated.data.email, err);
  }

  return {
    success: true,
    message: "Your application has been submitted! We will review it and send you an email with login details once approved.",
  };
}

"use server";

import { prisma }        from "@/lib/db/prisma";
import { hashPassword }  from "@/lib/auth/password";
import { Role, ApprovalStatus } from "@/generated/prisma/enums";
import { z }             from "zod";

const Schema = z.object({
  email:              z.string().email("Valid email is required"),
  firstName:          z.string().min(1, "First name is required"),
  lastName:           z.string().min(1, "Last name is required"),
  password:           z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword:    z.string().min(1, "Please confirm your password"),
  aictherapy:         z.string().min(1, "This field is required"),
  license:            z.string().optional(),
  websiteLink:        z.string().url("Enter a valid URL (https://...)").optional().or(z.literal("")),
  country:            z.string().optional(),
  addressOne:         z.string().optional(),
  addressTwo:         z.string().optional(),
  city:               z.string().optional(),
  state:              z.string().optional(),
  zipCode:            z.string().optional(),
  phone:              z.string().optional(),
  officeContactNumber:z.string().optional(),
  fax:                z.string().optional(),
  nameOfPractice:     z.string().optional(),
  yearsInPractice:    z.coerce.number().min(0).optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegisterPhysicianState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
} | undefined;

export async function registerPhysician(
  _state: RegisterPhysicianState,
  formData: FormData
): Promise<RegisterPhysicianState> {
  const raw = {
    email:               (formData.get("email") as string)?.trim().toLowerCase(),
    firstName:           (formData.get("firstName") as string)?.trim(),
    lastName:            (formData.get("lastName") as string)?.trim(),
    password:            formData.get("password") as string,
    confirmPassword:     formData.get("confirmPassword") as string,
    aictherapy:          (formData.get("aictherapy") as string)?.trim(),
    license:             (formData.get("license") as string) || undefined,
    websiteLink:         (formData.get("websiteLink") as string) || undefined,
    country:             (formData.get("country") as string) || undefined,
    addressOne:          (formData.get("addressOne") as string) || undefined,
    addressTwo:          (formData.get("addressTwo") as string) || undefined,
    city:                (formData.get("city") as string) || undefined,
    state:               (formData.get("state") as string) || undefined,
    zipCode:             (formData.get("zipCode") as string) || undefined,
    phone:               (formData.get("phone") as string) || undefined,
    officeContactNumber: (formData.get("officeContactNumber") as string) || undefined,
    fax:                 (formData.get("fax") as string) || undefined,
    nameOfPractice:      (formData.get("nameOfPractice") as string) || undefined,
    yearsInPractice:     formData.get("yearsInPractice") ? Number(formData.get("yearsInPractice")) : undefined,
  };

  const validated = Schema.safeParse(raw);
  if (!validated.success) {
    return { errors: z.flattenError(validated.error).fieldErrors };
  }

  const exists = await prisma.partneringPhysician.findUnique({
    where: { email: validated.data.email },
  });
  if (exists) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const specialtiesRaw = formData.get("fieldsOfSpeciality") as string;
  const fieldsOfSpeciality: string[] = specialtiesRaw ? JSON.parse(specialtiesRaw) : [];

  const hashed = await hashPassword(validated.data.password);

  const { confirmPassword, country, ...rest } = validated.data;

  await prisma.partneringPhysician.create({
    data: {
      ...rest,
      password:          hashed,
      fieldsOfSpeciality,
      isApproved:        ApprovalStatus.PENDING,
      addedByRole:       Role.PHYSICIAN,
      commission:        0,
      uplineCommission:  0,
    },
  });

  return { success: true, message: "Registration submitted! We will review your application and contact you soon." };
}

"use server";

import { prisma }                    from "@/lib/db/prisma";
import { hashPassword }              from "@/lib/auth/password";
import { randomPlaceholderPassword } from "@/lib/auth/reset-token";
import { Role, ApprovalStatus }      from "@/generated/prisma/enums";
import { z }                         from "zod";

const Schema = z.object({
  email:               z.string().email("Valid email is required"),
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
  yearsInPractice:     z.coerce.number().min(0, "Must be 0 or more"),
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
    firstName:           (formData.get("firstName") as string)?.trim(),
    lastName:            (formData.get("lastName") as string)?.trim(),
    aictherapy:          (formData.get("aictherapy") as string)?.trim(),
    license:             (formData.get("license") as string)?.trim(),
    websiteLink:         (formData.get("websiteLink") as string)?.trim(),
    country:             (formData.get("country") as string)?.trim(),
    addressOne:          (formData.get("addressOne") as string)?.trim(),
    addressTwo:          (formData.get("addressTwo") as string) || undefined,
    city:                (formData.get("city") as string)?.trim(),
    state:               (formData.get("state") as string)?.trim(),
    zipCode:             (formData.get("zipCode") as string)?.trim(),
    phone:               (formData.get("phone") as string)?.trim(),
    officeContactNumber: (formData.get("officeContactNumber") as string)?.trim(),
    fax:                 (formData.get("fax") as string)?.trim(),
    nameOfPractice:      (formData.get("nameOfPractice") as string)?.trim(),
    yearsInPractice:     formData.get("yearsInPractice") || undefined,
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

  const { country, ...rest } = validated.data;
  const placeholder = randomPlaceholderPassword();
  const hashed      = await hashPassword(placeholder);

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

  return {
    success: true,
    message: "Your application has been submitted! We will review it and send you an email with login details once approved.",
  };
}

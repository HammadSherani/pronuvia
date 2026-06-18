import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-zA-Z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character");

export const CreatePhysicianSchema = z
  .object({
    firstName:           z.string().min(1, "First name is required").trim(),
    lastName:            z.string().min(1, "Last name is required").trim(),
    email:               z.string().email("Invalid email address").trim().toLowerCase(),
    password:            passwordSchema,
    confirmPassword:     z.string().min(1, "Please confirm your password"),
    aictherapy:          z.string().optional(),
    license:             z.string().optional(),
    websiteLink:         z.string().url("Invalid URL").optional().or(z.literal("")),
    addressOne:          z.string().optional(),
    addressTwo:          z.string().optional(),
    city:                z.string().optional(),
    state:               z.string().optional(),
    zipCode:             z.string().optional(),
    phone:               z.string().optional(),
    officeContactNumber: z.string().optional(),
    fax:                 z.string().optional(),
    nameOfPractice:      z.string().optional(),
    yearsInPractice:     z.number().int().min(0).optional(),
    fieldsOfSpeciality:  z.array(z.string()).optional().default([]),
    commission:          z.number().min(0).max(100).optional().default(0),
    uplineCommission:    z.number().min(0).max(100).optional().default(0),
    salesRepId:          z.string().optional(),
    bankName:            z.string().optional(),
    bankAccountNumber:   z.string().optional(),
    bankAccountName:     z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const UpdatePhysicianSchema = z.object({
  firstName:           z.string().min(1).trim().optional(),
  lastName:            z.string().min(1).trim().optional(),
  email:               z.string().email().trim().toLowerCase().optional(),
  aictherapy:          z.string().optional(),
  license:             z.string().optional(),
  websiteLink:         z.string().url("Invalid URL").optional().or(z.literal("")),
  addressOne:          z.string().optional(),
  addressTwo:          z.string().optional(),
  city:                z.string().optional(),
  state:               z.string().optional(),
  zipCode:             z.string().optional(),
  phone:               z.string().optional(),
  officeContactNumber: z.string().optional(),
  fax:                 z.string().optional(),
  nameOfPractice:      z.string().optional(),
  yearsInPractice:     z.number().int().min(0).optional(),
  fieldsOfSpeciality:  z.array(z.string()).optional(),
  commission:          z.number().min(0).max(100).optional(),
  uplineCommission:    z.number().min(0).max(100).optional(),
  salesRepId:          z.string().optional(),
  bankName:            z.string().optional(),
  bankAccountNumber:   z.string().optional(),
  bankAccountName:     z.string().optional(),
});

export type CreatePhysicianInput = z.infer<typeof CreatePhysicianSchema>;
export type UpdatePhysicianInput = z.infer<typeof UpdatePhysicianSchema>;

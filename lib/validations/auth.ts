import { z } from "zod";

export const AdminRegisterSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  setupToken: z.string().min(1, "Setup token is required"),
});

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type AdminRegisterInput = z.infer<typeof AdminRegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;

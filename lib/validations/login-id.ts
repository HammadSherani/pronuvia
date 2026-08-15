import { z } from "zod";

export const LOGIN_ID_REGEX = /^[a-z0-9._-]{3,30}$/;

export const LoginIdSchema = z
  .string()
  .min(3, "Login ID must be at least 3 characters")
  .max(30, "Login ID must be at most 30 characters")
  .regex(/^[a-zA-Z0-9._-]+$/, "Login ID can only contain letters, numbers, dots, underscores, and hyphens")
  .trim()
  .toLowerCase()
  .refine((val) => LOGIN_ID_REGEX.test(val), {
    message: "Login ID must be 3–30 characters (letters, numbers, dots, underscores, hyphens)",
  });

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function normalizeLoginIdentifier(value: string): string {
  return value.trim().toLowerCase();
}

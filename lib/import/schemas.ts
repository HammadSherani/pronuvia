// Zod schemas for bulk-import rows. These validate the already-coerced field
// shape (produced by each entity handler using lib/import/coerce.ts), not
// raw Excel cells. Field names match the `key`s in lib/import/registry.ts.
// Kept intentionally separate from the FormData-oriented single-create
// schemas (e.g. CreatePhysicianSchema) — several of those fields (notably
// yearsInPractice) are string-with-transform shapes built for a <form>, and
// a coerced Excel cell arrives as a number, not a string, so reuse via
// omit/extend would need overriding most of the schema anyway. The validation
// *rules* below (required fields, ranges, regexes) intentionally mirror the
// single-create actions so an imported record can never be less strict than
// one entered by hand.
import { z } from "zod";
import { LoginIdSchema } from "@/lib/validations/login-id";

export const ImportCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const ImportSubCategorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryName: z.string().min(1, "Category Name is required"),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});

export const ImportProductGroupSchema = z.object({
  title: z.string().min(1, "Title is required"),
  categoryName: z.string().min(1, "Category Name is required"),
  subCategoryName: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).default([]),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
  image: z.string().optional(),
  imageGallery: z.array(z.string()).default([]),
});

export const ImportProductVariantSchema = z.object({
  variantSize: z.string().min(1, "Variant Size is required"),
  variantSku: z.string().optional(),
  variantGtin: z.string().optional(),
  variantImage: z.string().optional(),
  variantCost: z.number().min(0).optional(),
  variantSale: z.number().min(0).optional(),
  variantStock: z.number().int().min(0).optional(),
  variantWeight: z.number().min(0).optional(),
  variantStatus: z.enum(["in_stock", "out_of_stock", "discontinued", "inactive"]).default("in_stock"),
});

export const ImportCouponSchema = z.object({
  code: z.string().min(1, "Code is required"),
  description: z.string().optional(),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive("Discount Value must be greater than 0"),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(0).optional(),
  usedCount: z.number().int().min(0).default(0),
  expiresAt: z.date().optional(),
  isActive: z.boolean().default(true),
  applicableTo: z.enum(["ALL", "SALES_REP", "PHYSICIAN"]).default("ALL"),
}).refine(
  (d) => d.discountType !== "PERCENTAGE" || d.discountValue <= 100,
  { message: "Percentage discount cannot exceed 100%", path: ["discountValue"] },
);

export const ImportShippingRateSchema = z.object({
  country: z.string().min(1, "Country is required"),
  states: z.array(z.string()).default([]),
  method: z.enum(["FLAT", "FREE", "LOCAL_PICKUP"]),
  cost: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  continent: z.string().optional(),
});

export const ImportPhysicianSchema = z.object({
  firstName: z.string().min(1, "First Name is required").trim(),
  lastName: z.string().min(1, "Last Name is required").trim(),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  loginId: LoginIdSchema,
  phone: z.string().optional(),
  officeContactNumber: z.string().optional(),
  fax: z.string().optional(),
  nameOfPractice: z.string().optional(),
  websiteLink: z.string().optional(),
  license: z.string().optional(),
  aictherapy: z.string().optional(),
  fieldsOfSpeciality: z.array(z.string()).default([]),
  yearsInPractice: z.number().int().min(0, "Years in Practice must be 0 or more"),
  addressOne: z.string().optional(),
  addressTwo: z.string().optional(),
  city: z.string().optional(),
  state: z.string().min(1, "State is required"),
  zipCode: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  isApproved: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("APPROVED"),
  commission: z.number().min(0).max(100).default(0),
  uplineCommission: z.number().min(0).max(100).default(0),
  salesRepEmail: z.string().email().trim().toLowerCase().optional(),
  walletBalance: z.number().min(0).default(0),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  swiftCode: z.string().optional(),
  routingNumber: z.string().optional(),
  createdAt: z.date().optional(),
});

export const ImportSalesRepSchema = z.object({
  firstName: z.string().min(1, "First Name is required").trim(),
  lastName: z.string().min(1, "Last Name is required").trim(),
  email: z.string().email("Invalid email address").trim().toLowerCase(),
  loginId: LoginIdSchema.optional(),
  phone: z.string().optional(),
  commission: z.number().min(0).max(100).default(0),
  walletBalance: z.number().min(0).default(0),
  billingAddress: z.string().optional(),
  shippingAddress: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankAccountName: z.string().optional(),
  swiftCode: z.string().optional(),
  routingNumber: z.string().optional(),
  createdAt: z.date().optional(),
});

export const ImportOrderGroupSchema = z.object({
  orderNumber: z.string().optional(),
  createdAt: z.date({ error: "Order Date is required" }),
  physicianEmail: z.string().email("Invalid Physician Email").trim().toLowerCase(),
  salesRepEmail: z.string().email().trim().toLowerCase().optional(),
  status: z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "COMPLETED", "CANCELLED", "REFUNDED"]).default("COMPLETED"),
  subtotal: z.number().min(0).optional(),
  shippingRate: z.number().min(0).default(0),
  discountAmount: z.number().min(0).default(0),
  couponCode: z.string().optional(),
  total: z.number().min(0).optional(),
  physicianCommissionRate: z.number().min(0).max(100).default(0),
  physicianCommissionAmount: z.number().min(0).optional(),
  salesRepCommissionRate: z.number().min(0).max(100).default(0),
  salesRepCommissionAmount: z.number().min(0).optional(),
  paymentMethod: z.string().optional(),
  paymentStatus: z.string().optional(),
  transactionId: z.string().optional(),
  shippingCarrier: z.string().optional(),
  trackingNumber: z.string().optional(),
  customerEmail: z.string().email().trim().toLowerCase().optional(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  shipFirstName: z.string().optional(),
  shipLastName: z.string().optional(),
  shipPhone: z.string().optional(),
  shipAddress1: z.string().optional(),
  shipAddress2: z.string().optional(),
  shipCity: z.string().optional(),
  shipState: z.string().optional(),
  shipZip: z.string().optional(),
  shipCountry: z.string().optional(),
  billFirstName: z.string().optional(),
  billLastName: z.string().optional(),
  billPhone: z.string().optional(),
  billAddress1: z.string().optional(),
  billAddress2: z.string().optional(),
  billCity: z.string().optional(),
  billState: z.string().optional(),
  billZip: z.string().optional(),
  billCountry: z.string().optional(),
});

export const ImportOrderItemRowSchema = z.object({
  itemSku: z.string().optional(),
  itemTitle: z.string().min(1, "Item Title is required"),
  itemVariantSize: z.string().optional(),
  itemQuantity: z.number().int().min(1, "Item Quantity must be at least 1"),
  itemUnitPrice: z.number().min(0, "Item Unit Price must be 0 or more"),
  itemLineTotal: z.number().min(0).optional(),
});

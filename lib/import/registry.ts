import type { ColumnDef, ImportEntity, RawRow } from "./types";

export const ENTITY_LABELS: Record<ImportEntity, {
  label: string;
  sheetName: string;
  fileName: string;
  listPath: string;
  description: string;
  dependsOn: ImportEntity[];
}> = {
  category:     { label: "Categories",      sheetName: "Data", fileName: "pronuvia-categories-template",     listPath: "/admin/categories",     description: "Top-level product categories.",                              dependsOn: [] },
  subCategory:  { label: "Sub Categories",   sheetName: "Data", fileName: "pronuvia-sub-categories-template", listPath: "/admin/sub-categories", description: "Nested under a category.",                                   dependsOn: ["category"] },
  product:      { label: "Products",         sheetName: "Data", fileName: "pronuvia-products-template",       listPath: "/admin/products",       description: "One row per variant — rows sharing a Title become one product.", dependsOn: ["category", "subCategory"] },
  salesRep:     { label: "Medical Reps",     sheetName: "Data", fileName: "pronuvia-medical-reps-template",   listPath: "/admin/sales-reps",     description: "Sales representatives.",                                     dependsOn: [] },
  physician:    { label: "Physicians",       sheetName: "Data", fileName: "pronuvia-physicians-template",     listPath: "/admin/physicians",     description: "Partnering physicians / doctors.",                           dependsOn: ["salesRep"] },
  coupon:       { label: "Coupons",          sheetName: "Data", fileName: "pronuvia-coupons-template",        listPath: "/admin/coupons",        description: "Discount codes.",                                             dependsOn: [] },
  shippingRate: { label: "Shipping Rates",   sheetName: "Data", fileName: "pronuvia-shipping-rates-template", listPath: "/admin/shipping-rates", description: "Country/state shipping rules.",                              dependsOn: [] },
  order:        { label: "Orders",           sheetName: "Data", fileName: "pronuvia-orders-template",         listPath: "/admin/orders",         description: "Historical orders — record only, no wallet effects.",        dependsOn: ["physician", "salesRep", "product"] },
};

export const IMPORT_ORDER: ImportEntity[] = [
  "category", "subCategory", "salesRep", "physician", "product", "coupon", "shippingRate", "order",
];

function col(def: ColumnDef): ColumnDef {
  return def;
}

export const COLUMNS: Record<ImportEntity, ColumnDef[]> = {
  category: [
    col({ key: "name",        header: "Name*",        required: true,  format: "Text",             example: "Skin Care" }),
    col({ key: "description", header: "Description",  required: false, format: "Text",             example: "Skincare essentials" }),
    col({ key: "isActive",    header: "Active",        required: false, format: "Yes/No",           example: "Yes", note: "Defaults to Yes" }),
  ],

  subCategory: [
    col({ key: "name",         header: "Name*",          required: true,  format: "Text", example: "Moisturizers" }),
    col({ key: "categoryName", header: "Category Name*", required: true,  format: "Must match an existing Category's Name", example: "Skin Care" }),
    col({ key: "description",  header: "Description",    required: false, format: "Text", example: "" }),
    col({ key: "isActive",     header: "Active",         required: false, format: "Yes/No", example: "Yes", note: "Defaults to Yes" }),
  ],

  product: [
    // Group-level — fill once per product, leave blank on continuation rows.
    col({ key: "title",           header: "Title*",              required: true,  format: "Text", example: "Vitamin C Serum", note: "Same on every row of the same product" }),
    col({ key: "categoryName",    header: "Category Name*",      required: true,  format: "Must match an existing Category's Name", example: "Skin Care" }),
    col({ key: "subCategoryName", header: "Sub Category Name",   required: false, format: "Must match an existing Sub Category under the Category", example: "Serums" }),
    col({ key: "description",     header: "Description",         required: false, format: "Text", example: "" }),
    col({ key: "tags",            header: "Tags",                required: false, format: "Comma-separated", example: "best-seller, vegan" }),
    col({ key: "status",          header: "Status",              required: false, format: "ACTIVE / DRAFT / ARCHIVED", example: "ACTIVE", note: "Defaults to ACTIVE" }),
    col({ key: "image",           header: "Product Image URL",   required: false, format: "URL", example: "" }),
    col({ key: "imageGallery",    header: "Gallery Image URLs",  required: false, format: "Comma-separated URLs", example: "" }),
    // Row-level — fill on every row.
    col({ key: "variantSize",   header: "Variant Size*",       required: true,  format: "Text", example: "30ml" }),
    col({ key: "variantSku",    header: "Variant SKU",         required: false, format: "Text", example: "VCS-30" }),
    col({ key: "variantGtin",   header: "Variant GTIN",        required: false, format: "Text", example: "" }),
    col({ key: "variantImage",  header: "Variant Image URL",   required: false, format: "URL", example: "" }),
    col({ key: "variantCost",   header: "Variant Cost Price",  required: false, format: "Number", example: "8.50" }),
    col({ key: "variantSale",   header: "Variant Sale Price",  required: false, format: "Number", example: "24.99" }),
    col({ key: "variantStock",  header: "Variant Stock",       required: false, format: "Whole number", example: "100" }),
    col({ key: "variantWeight", header: "Variant Weight",      required: false, format: "Number (kg)", example: "0.1" }),
    col({ key: "variantStatus", header: "Variant Status",      required: false, format: "in_stock / out_of_stock / discontinued / inactive", example: "in_stock", note: "Defaults to in_stock" }),
  ],

  coupon: [
    col({ key: "code",           header: "Code*",            required: true,  format: "Text", example: "WELCOME10", note: "Stored uppercase" }),
    col({ key: "description",    header: "Description",      required: false, format: "Text", example: "" }),
    col({ key: "discountType",   header: "Discount Type*",   required: true,  format: "PERCENTAGE / FIXED", example: "PERCENTAGE" }),
    col({ key: "discountValue",  header: "Discount Value*",  required: true,  format: "Number", example: "10", note: "PERCENTAGE must be ≤ 100" }),
    col({ key: "minOrderAmount", header: "Min Order Amount",  required: false, format: "Number", example: "" }),
    col({ key: "maxUses",        header: "Max Uses",          required: false, format: "Whole number", example: "" }),
    col({ key: "usedCount",      header: "Used Count",        required: false, format: "Whole number", example: "0", note: "Carries over historical redemption counts" }),
    col({ key: "expiresAt",      header: "Expires At",        required: false, format: "Date", example: "2026-12-31" }),
    col({ key: "isActive",       header: "Active",            required: false, format: "Yes/No", example: "Yes", note: "Defaults to Yes" }),
    col({ key: "applicableTo",   header: "Applicable To",     required: false, format: "ALL / SALES_REP / PHYSICIAN", example: "ALL", note: "Defaults to ALL" }),
  ],

  shippingRate: [
    col({ key: "country",   header: "Country*",  required: true,  format: "Country name or 2-letter code", example: "United States" }),
    col({ key: "states",    header: "States",     required: false, format: "Comma-separated state names or codes", example: "California, New York", note: "Blank = country-wide" }),
    col({ key: "method",    header: "Method*",    required: true,  format: "FLAT / FREE / LOCAL_PICKUP", example: "FLAT" }),
    col({ key: "cost",      header: "Cost",       required: false, format: "Number", example: "9.99", note: "Required (> 0) when Method = FLAT" }),
    col({ key: "isActive",  header: "Active",     required: false, format: "Yes/No", example: "Yes", note: "Defaults to Yes" }),
    col({ key: "continent", header: "Continent",  required: false, format: "Text", example: "", note: "Auto-derived from Country if left blank" }),
  ],

  physician: [
    col({ key: "firstName",           header: "First Name*",                required: true,  format: "Text", example: "Jane" }),
    col({ key: "lastName",            header: "Last Name*",                 required: true,  format: "Text", example: "Doe" }),
    col({ key: "email",               header: "Email*",                     required: true,  format: "Email", example: "jane.doe@example.com" }),
    col({ key: "loginId",             header: "Login ID*",                  required: true,  format: "3-64 chars: letters, numbers, . _ - @ +", example: "jane.doe" }),
    col({ key: "phone",               header: "Phone",                      required: false, format: "Text", example: "" }),
    col({ key: "officeContactNumber", header: "Office Phone",               required: false, format: "Text", example: "" }),
    col({ key: "fax",                 header: "Fax",                        required: false, format: "Text", example: "" }),
    col({ key: "nameOfPractice",      header: "Practice Name",              required: false, format: "Text", example: "" }),
    col({ key: "websiteLink",         header: "Website",                    required: false, format: "URL", example: "" }),
    col({ key: "license",             header: "License",                    required: false, format: "Text", example: "" }),
    col({ key: "aictherapy",          header: "AIC Therapy",                required: false, format: "Text", example: "" }),
    col({ key: "fieldsOfSpeciality",  header: "Fields of Specialty",        required: false, format: "Comma-separated", example: "Dermatology" }),
    col({ key: "yearsInPractice",     header: "Years in Practice*",         required: true,  format: "Whole number", example: "5" }),
    col({ key: "addressOne",          header: "Address 1",                  required: false, format: "Text", example: "" }),
    col({ key: "addressTwo",          header: "Address 2",                  required: false, format: "Text", example: "" }),
    col({ key: "city",                header: "City",                       required: false, format: "Text", example: "" }),
    col({ key: "state",               header: "State*",                     required: true,  format: "State name or code", example: "New York" }),
    col({ key: "zipCode",             header: "Zip Code",                   required: false, format: "Text", example: "" }),
    col({ key: "country",             header: "Country*",                   required: true,  format: "Country name or code", example: "United States" }),
    col({ key: "isApproved",          header: "Status",                     required: false, format: "Approved / Pending / Rejected", example: "Approved", note: "Defaults to Approved" }),
    col({ key: "commission",          header: "Doctor Commission (%)",      required: false, format: "Number 0-100", example: "10" }),
    col({ key: "uplineCommission",    header: "Rep Upline Commission (%)",  required: false, format: "Number 0-100", example: "5" }),
    col({ key: "salesRepEmail",       header: "Medical Rep Email",          required: false, format: "Must match an existing Medical Rep's Email", example: "" }),
    col({ key: "walletBalance",       header: "Opening Wallet Balance ($)", required: false, format: "Number", example: "0" }),
    col({ key: "bankName",            header: "Bank Name",                  required: false, format: "Text", example: "" }),
    col({ key: "bankAccountNumber",   header: "Bank Account #",             required: false, format: "Text", example: "" }),
    col({ key: "bankAccountName",     header: "Bank Account Name",          required: false, format: "Text", example: "" }),
    col({ key: "swiftCode",           header: "Swift Code",                 required: false, format: "Text", example: "" }),
    col({ key: "routingNumber",       header: "Routing Number",             required: false, format: "Text", example: "" }),
    col({ key: "createdAt",           header: "Sign-up Date",               required: false, format: "Date", example: "2024-01-15" }),
  ],

  salesRep: [
    col({ key: "firstName",         header: "First Name*",                required: true,  format: "Text", example: "John" }),
    col({ key: "lastName",          header: "Last Name*",                 required: true,  format: "Text", example: "Smith" }),
    col({ key: "email",             header: "Email*",                     required: true,  format: "Email", example: "john.smith@example.com" }),
    col({ key: "loginId",           header: "Login ID",                   required: false, format: "3-64 chars: letters, numbers, . _ - @ +", example: "" }),
    col({ key: "phone",             header: "Phone",                      required: false, format: "Text", example: "" }),
    col({ key: "commission",        header: "Commission (%)",             required: false, format: "Number 0-100", example: "10" }),
    col({ key: "walletBalance",     header: "Opening Wallet Balance ($)", required: false, format: "Number", example: "0" }),
    col({ key: "billingAddress",    header: "Billing Address",            required: false, format: "Text", example: "" }),
    col({ key: "shippingAddress",   header: "Shipping Address",           required: false, format: "Text", example: "" }),
    col({ key: "bankName",          header: "Bank Name",                  required: false, format: "Text", example: "" }),
    col({ key: "bankAccountNumber", header: "Bank Account #",             required: false, format: "Text", example: "" }),
    col({ key: "bankAccountName",   header: "Bank Account Name",          required: false, format: "Text", example: "" }),
    col({ key: "swiftCode",         header: "Swift Code",                 required: false, format: "Text", example: "" }),
    col({ key: "routingNumber",     header: "Routing Number",             required: false, format: "Text", example: "" }),
    col({ key: "createdAt",         header: "Sign-up Date",               required: false, format: "Date", example: "" }),
  ],

  order: [
    // Order-level (first row of the group).
    col({ key: "orderNumber",          header: "Order Number",                required: false, format: "Text", example: "12045", note: "Blank = auto-generated" }),
    col({ key: "createdAt",            header: "Order Date*",                 required: true,  format: "Date", example: "2024-06-15" }),
    col({ key: "physicianEmail",       header: "Physician Email*",            required: true,  format: "Must match an existing Physician's Email", example: "jane.doe@example.com" }),
    col({ key: "salesRepEmail",        header: "Medical Rep Email",           required: false, format: "Must match an existing Medical Rep's Email", example: "", note: "Blank = physician's assigned rep" }),
    col({ key: "status",               header: "Status",                      required: false, format: "PENDING/PROCESSING/SHIPPED/DELIVERED/COMPLETED/CANCELLED/REFUNDED", example: "COMPLETED", note: "Defaults to COMPLETED" }),
    col({ key: "subtotal",             header: "Subtotal",                    required: false, format: "Number", example: "", note: "Blank = sum of line totals" }),
    col({ key: "shippingRate",         header: "Shipping Cost",               required: false, format: "Number", example: "0" }),
    col({ key: "discountAmount",       header: "Discount Amount",             required: false, format: "Number", example: "0" }),
    col({ key: "couponCode",           header: "Coupon Code",                 required: false, format: "Text", example: "" }),
    col({ key: "total",                header: "Total",                       required: false, format: "Number", example: "", note: "Blank = subtotal + shipping - discount" }),
    col({ key: "physicianCommissionRate",   header: "Doctor Commission Rate (%)",  required: false, format: "Number 0-100", example: "" }),
    col({ key: "physicianCommissionAmount", header: "Doctor Commission Amount",    required: false, format: "Number", example: "", note: "Blank = Total × Rate / 100" }),
    col({ key: "salesRepCommissionRate",    header: "Rep Commission Rate (%)",     required: false, format: "Number 0-100", example: "" }),
    col({ key: "salesRepCommissionAmount",  header: "Rep Commission Amount",       required: false, format: "Number", example: "", note: "Blank = Total × Rate / 100" }),
    col({ key: "paymentMethod",        header: "Payment Method",              required: false, format: "Text", example: "CARD" }),
    col({ key: "paymentStatus",        header: "Payment Status",              required: false, format: "Text", example: "PAID" }),
    col({ key: "transactionId",        header: "Transaction ID",              required: false, format: "Text", example: "" }),
    col({ key: "shippingCarrier",      header: "Shipping Carrier",            required: false, format: "Text", example: "" }),
    col({ key: "trackingNumber",       header: "Tracking Number",             required: false, format: "Text", example: "" }),
    col({ key: "customerEmail",        header: "Customer Email",              required: false, format: "Email", example: "" }),
    col({ key: "customerPhone",        header: "Customer Phone",              required: false, format: "Text", example: "" }),
    col({ key: "notes",                header: "Notes",                       required: false, format: "Text", example: "" }),
    col({ key: "shipFirstName", header: "Ship To First Name", required: false, format: "Text", example: "" }),
    col({ key: "shipLastName",  header: "Ship To Last Name",  required: false, format: "Text", example: "" }),
    col({ key: "shipPhone",     header: "Ship To Phone",      required: false, format: "Text", example: "" }),
    col({ key: "shipAddress1",  header: "Ship To Address 1",  required: false, format: "Text", example: "" }),
    col({ key: "shipAddress2",  header: "Ship To Address 2",  required: false, format: "Text", example: "" }),
    col({ key: "shipCity",      header: "Ship To City",       required: false, format: "Text", example: "" }),
    col({ key: "shipState",     header: "Ship To State",      required: false, format: "State name or code", example: "" }),
    col({ key: "shipZip",       header: "Ship To Zip",        required: false, format: "Text", example: "" }),
    col({ key: "shipCountry",   header: "Ship To Country",    required: false, format: "Country name or code", example: "" }),
    col({ key: "billFirstName", header: "Bill To First Name", required: false, format: "Text", example: "", note: "Blank = same as Ship To" }),
    col({ key: "billLastName",  header: "Bill To Last Name",  required: false, format: "Text", example: "" }),
    col({ key: "billPhone",     header: "Bill To Phone",      required: false, format: "Text", example: "" }),
    col({ key: "billAddress1",  header: "Bill To Address 1",  required: false, format: "Text", example: "" }),
    col({ key: "billAddress2",  header: "Bill To Address 2",  required: false, format: "Text", example: "" }),
    col({ key: "billCity",      header: "Bill To City",       required: false, format: "Text", example: "" }),
    col({ key: "billState",     header: "Bill To State",      required: false, format: "State name or code", example: "" }),
    col({ key: "billZip",       header: "Bill To Zip",        required: false, format: "Text", example: "" }),
    col({ key: "billCountry",   header: "Bill To Country",    required: false, format: "Country name or code", example: "" }),
    // Item-level (every row).
    col({ key: "itemSku",         header: "Item Product SKU",   required: false, format: "Must match an existing Product's Variant SKU", example: "" }),
    col({ key: "itemTitle",       header: "Item Title*",        required: true,  format: "Text", example: "Vitamin C Serum" }),
    col({ key: "itemVariantSize", header: "Item Variant Size",  required: false, format: "Text", example: "30ml" }),
    col({ key: "itemQuantity",    header: "Item Quantity*",     required: true,  format: "Whole number ≥ 1", example: "1" }),
    col({ key: "itemUnitPrice",   header: "Item Unit Price*",   required: true,  format: "Number", example: "24.99" }),
    col({ key: "itemLineTotal",   header: "Item Line Total",    required: false, format: "Number", example: "", note: "Blank = Quantity × Unit Price" }),
  ],
};

/** Lowercase, trim, collapse whitespace, strip a trailing "*", strip
 * parenthetical hints, strip everything but letters/digits — so header
 * matching is resilient to the admin re-typing/re-casing a header. */
export function normalizeHeader(h: string): string {
  return h
    .trim()
    .replace(/\*\s*$/, "")
    .replace(/\([^)]*\)/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_INDEX: Partial<Record<ImportEntity, Map<string, string>>> = {};

function getHeaderIndex(entity: ImportEntity): Map<string, string> {
  let idx = HEADER_INDEX[entity];
  if (idx) return idx;
  idx = new Map();
  for (const c of COLUMNS[entity]) {
    idx.set(normalizeHeader(c.header), c.key);
    for (const alias of c.aliases ?? []) idx.set(normalizeHeader(alias), c.key);
  }
  HEADER_INDEX[entity] = idx;
  return idx;
}

export function mapRowToFields(entity: ImportEntity, raw: RawRow): {
  mapped: Record<string, unknown>;
  unknownHeaders: string[];
} {
  const idx = getHeaderIndex(entity);
  const mapped: Record<string, unknown> = {};
  const unknownHeaders: string[] = [];

  for (const [header, value] of Object.entries(raw)) {
    const key = idx.get(normalizeHeader(header));
    if (key) mapped[key] = value;
    else if (header.trim() !== "") unknownHeaders.push(header);
  }

  return { mapped, unknownHeaders };
}

export function missingRequiredHeaders(entity: ImportEntity, sampleRawHeaders: string[]): string[] {
  const idx = getHeaderIndex(entity);
  const seenKeys = new Set(
    sampleRawHeaders.map((h) => idx.get(normalizeHeader(h))).filter((k): k is string => !!k),
  );
  return COLUMNS[entity]
    .filter((c) => c.required && !seenKeys.has(c.key))
    .map((c) => c.header);
}

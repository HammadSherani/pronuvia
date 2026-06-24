"use server";

// Kept for backward-compat imports — unified into manage-withdrawals.ts
export {
  updateWithdrawRequest  as updatePhysicianWithdrawRequest,
  bulkUpdateWithdrawals  as bulkUpdatePhysicianWithdrawals,
} from "@/actions/admin/manage-withdrawals";

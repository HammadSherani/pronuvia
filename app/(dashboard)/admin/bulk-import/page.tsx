import { requireAdmin } from "@/lib/auth/dal";
import { getImportCounts } from "@/actions/admin/bulk-import";
import { BulkImportClient } from "@/components/admin/bulk-import-client";

export const metadata = { title: "Bulk Import – Admin" };
export const maxDuration = 60;

export default async function BulkImportPage() {
  await requireAdmin();
  const counts = await getImportCounts();

  return <BulkImportClient counts={counts} />;
}

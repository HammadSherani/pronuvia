import { requireAdmin } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/admin/page-header";
import { WalletAdjustmentClient } from "@/components/admin/wallet-adjustment-client";

export const metadata = { title: "Wallet Adjustment – Pronuvia Admin" };

export default async function WalletAdjustmentPage() {
  await requireAdmin();

  const reps = await prisma.salesRepresentative.findMany({
    select: {
      id:            true,
      firstName:     true,
      lastName:      true,
      email:         true,
      walletBalance: true,
    },
    orderBy: { firstName: "asc" },
  });

  const totalWalletValue = reps.reduce((s, r) => s + (r.walletBalance ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Wallet Adjustment"
        description="Manually credit or debit sales rep wallet balances"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-5 mb-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="w-8 h-1 rounded-full mb-3 bg-[#3DBFA4]" />
          <p className="text-xl font-bold text-[#3DBFA4]">{reps.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total Sales Reps</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="w-8 h-1 rounded-full mb-3 bg-blue-400" />
          <p className="text-xl font-bold text-blue-600">
            {totalWalletValue.toLocaleString("en-US", { style: "currency", currency: "USD" })}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Total Wallet Value</p>
        </div>
      </div>

      <WalletAdjustmentClient reps={reps} />
    </div>
  );
}

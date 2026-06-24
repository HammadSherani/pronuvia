import { requireAdmin } from "@/lib/auth/dal";
import { prisma }        from "@/lib/db/prisma";
import { PageHeader }    from "@/components/admin/page-header";
import { AllWalletAdjustmentClient } from "@/components/admin/all-wallet-adjustment-client";

export const metadata = { title: "Wallet Adjustment – Pronuvia Admin" };

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function WalletAdjustmentPage() {
  await requireAdmin();

  const [reps, physicians] = await Promise.all([
    prisma.salesRepresentative.findMany({
      select: { id: true, firstName: true, lastName: true, email: true, walletBalance: true },
      orderBy: { firstName: "asc" },
    }),
    prisma.partneringPhysician.findMany({
      where:   { isApproved: "APPROVED" },
      select: { id: true, firstName: true, lastName: true, email: true, walletBalance: true },
      orderBy: { firstName: "asc" },
    }),
  ]);

  const totalRepWallet = reps.reduce((s, r) => s + (r.walletBalance ?? 0), 0);
  const totalDrWallet  = physicians.reduce((s, p) => s + (p.walletBalance ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Wallet Adjustment"
        description="Manually credit or debit sales rep and doctor wallet balances"
      />

      <div className="grid grid-cols-4 gap-5 mb-6">
        {[
          { label: "Total Sales Reps",      value: reps.length,         color: "#3DBFA4", text: "text-[#3DBFA4]" },
          { label: "Rep Wallet Total",       value: fmt(totalRepWallet), color: "#3DBFA4", text: "text-[#3DBFA4]" },
          { label: "Total Doctors",          value: physicians.length,   color: "#6366f1", text: "text-indigo-600" },
          { label: "Doctor Wallet Total",    value: fmt(totalDrWallet),  color: "#6366f1", text: "text-indigo-600" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="w-8 h-1 rounded-full mb-3" style={{ background: c.color }} />
            <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      <AllWalletAdjustmentClient reps={reps} physicians={physicians} />
    </div>
  );
}

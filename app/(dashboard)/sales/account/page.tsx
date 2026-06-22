import { requireSalesRep } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { SalesProfileForm } from "./_components/sales-profile-form";
import { SalesPasswordForm } from "./_components/sales-password-form";

export const metadata = { title: "Account Details – Pronuvia" };

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="w-8 h-1 rounded-full mb-3" style={{ background: color }} />
      <p className="text-xl font-bold text-gray-800">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function SalesAccountPage() {
  const session = await requireSalesRep();

  const rep = await prisma.salesRepresentative.findUnique({
    where: { id: session.userId },
    select: {
      id: true, firstName: true, lastName: true, name: true,
      email: true, phone: true, website: true,
      commission: true, walletBalance: true, ordersCount: true,
      billingAddress: true, shippingAddress: true,
      bankName: true, bankAccountName: true, bankAccountNumber: true,
      createdAt: true,
      _count: { select: { physicians: true } },
    },
  });

  if (!rep) return <div className="text-gray-500">Account not found.</div>;

  const memberSince = new Date(rep.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Account Details</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your profile, bank details, and security</p>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3DBFA4] to-[#2a8f7a] flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-white">
            {rep.firstName.charAt(0)}{rep.lastName.charAt(0)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900">{rep.name}</p>
          <p className="text-sm text-gray-400">{rep.email}</p>
          <p className="text-xs text-gray-300 mt-0.5">Member since {memberSince}</p>
        </div>
        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-semibold">
            {rep.commission}% commission
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Wallet Balance"     value={fmt(rep.walletBalance)} color="#3DBFA4" />
        <StatCard label="Total Orders"       value={String(rep.ordersCount)} color="#5BB8D4" />
        <StatCard label="Downline Physicians" value={String(rep._count.physicians)} color="#8b5cf6" />
      </div>

      {/* Profile edit form */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-3 border-b border-gray-100">
          Profile &amp; Bank Details
        </h2>
        <SalesProfileForm rep={rep} />
      </div>

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-3 border-b border-gray-100">
          Change Password
        </h2>
        <SalesPasswordForm />
      </div>
    </div>
  );
}

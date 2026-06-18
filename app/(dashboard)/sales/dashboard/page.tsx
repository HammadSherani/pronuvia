import Link from "next/link";
import { requireSalesRep } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { ApprovalStatus } from "@/app/generated/prisma/enums";

export const metadata = { title: "Dashboard – Pronuvia" };

export default async function SalesDashboardPage() {
  const session = await requireSalesRep();

  const [totalPhysicians, pendingPhysicians] = await Promise.all([
    prisma.partneringPhysician.count({ where: { salesRepId: session.userId } }),
    prisma.partneringPhysician.count({ where: { salesRepId: session.userId, isApproved: ApprovalStatus.PENDING } }),
  ]);

  const rep = await prisma.salesRepresentative.findUnique({
    where: { id: session.userId },
    select: { firstName: true, lastName: true, commission: true, ordersCount: true },
  });

  const cards = [
    { label: "My Physicians", value: totalPhysicians, href: "/sales/physicians", color: "#3DBFA4" },
    { label: "Pending Approvals", value: pendingPhysicians, href: "/sales/physicians", color: "#f59e0b" },
    { label: "Commission Rate", value: `${rep?.commission ?? 0}%`, href: "/sales/account", color: "#5BB8D4" },
    { label: "Total Orders", value: rep?.ordersCount ?? 0, href: "/sales/orders", color: "#8b5cf6" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Welcome back, {rep?.firstName ?? session.email} 👋
        </h1>
        <p className="text-sm text-gray-500">Here&apos;s an overview of your account.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map((card) => (
          <Link key={card.label} href={card.href}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow group">
            <div className="w-10 h-1 rounded-full mb-4" style={{ background: card.color }} />
            <p className="text-3xl font-bold text-gray-800 mb-1 group-hover:text-[#3DBFA4] transition-colors">
              {card.value}
            </p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/sales/physicians"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#3DBFA4] text-white text-sm font-medium rounded-lg hover:bg-[#35a993] transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Physician
          </Link>
          <Link href="/sales/account"
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors">
            Account Details
          </Link>
        </div>
      </div>
    </div>
  );
}

import { requireAdmin } from "@/lib/auth/dal";

export const metadata = { title: "Admin Dashboard – Pronuvia" };

export default async function AdminDashboardPage() {
  const session = await requireAdmin();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">Admin Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Welcome back, {session.email}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          { label: "Sales Representatives", value: "—", color: "#3DBFA4" },
          { label: "Partnering Physicians", value: "—", color: "#5BB8D4" },
          { label: "Pending Approvals", value: "—", color: "#f59e0b" },
          { label: "Total Orders", value: "—", color: "#8b5cf6" },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
          >
            <div
              className="w-10 h-1 rounded-full mb-4"
              style={{ background: card.color }}
            />
            <p className="text-3xl font-bold text-gray-800 mb-1">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

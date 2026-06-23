import { requireRole } from "@/lib/auth/dal";
import { Role } from "@/generated/prisma/enums";
import { BannerCarousel } from "@/components/dashboard/banner-carousel";
import { getPublishedBanners } from "@/actions/admin/banners";

export const metadata = { title: "Dashboard – Pronuvia" };

export default async function PhysicianDashboardPage() {
  const session = await requireRole(Role.PHYSICIAN);
  const banners = await getPublishedBanners();

  return (
    <div>
      <BannerCarousel banners={banners} />

      <h1 className="text-2xl font-bold text-gray-800 mb-1">My Dashboard</h1>
      <p className="text-sm text-gray-500 mb-8">Welcome back, {session.email}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {[
          { label: "My Orders", value: "—", color: "#3DBFA4" },
          { label: "Downloads", value: "—", color: "#5BB8D4" },
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


import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth/dal";
import { MainHeader } from "@/components/dashboard/main-header";
import { SubHeader } from "@/components/dashboard/sub-header";
import { ToastProvider } from "@/components/toast-provider";
import { CartProviderWrapper } from "@/components/cart-provider-wrapper";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  return (
    <CartProviderWrapper userId={session.userId}>
      <div className="min-h-screen flex flex-col bg-[#f9fafb]">
        <ToastProvider />
        <MainHeader role={session.role} />
        <SubHeader role={session.role} />
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
          {children}
        </main>
      </div>
    </CartProviderWrapper>
  );
}

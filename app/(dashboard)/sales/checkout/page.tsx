import { requireSalesRep } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { CheckoutClient } from "@/components/sales/checkout-client";

export const metadata = { title: "Checkout – Pronuvia" };

export default async function CheckoutPage() {
  const session = await requireSalesRep();

  const rep = await prisma.salesRepresentative.findUnique({
    where:  { id: session.userId },
    select: {
      firstName:       true,
      lastName:        true,
      email:           true,
      phone:           true,
      shippingAddress: true,
      walletBalance:   true,
    },
  });

  return (
    <CheckoutClient
      repName={rep ? `${rep.firstName} ${rep.lastName}` : ""}
      repEmail={rep?.email ?? ""}
      repPhone={rep?.phone ?? ""}
      savedShippingAddress={rep?.shippingAddress ?? ""}
      walletBalance={rep?.walletBalance ?? 0}
    />
  );
}

import { requirePhysician } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { PhysicianCheckoutClient } from "@/components/physician/checkout-client";

export const metadata = { title: "Checkout – Pronuvia" };

export default async function PhysicianCheckoutPage() {
  const session = await requirePhysician();

  const physician = await prisma.partneringPhysician.findUnique({
    where:  { id: session.userId },
    select: {
      email:      true,
      firstName:  true,
      lastName:   true,
      addressOne: true,
      addressTwo: true,
      city:       true,
      state:      true,
      zipCode:    true,
    },
  });

  const initialAddress = {
    firstName: physician?.firstName  ?? "",
    lastName:  physician?.lastName   ?? "",
    address1:  physician?.addressOne ?? "",
    address2:  physician?.addressTwo ?? "",
    city:      physician?.city       ?? "",
    state:     physician?.state      ?? "",
    zip:       physician?.zipCode    ?? "",
    country:   "United States",
  };

  return (
    <PhysicianCheckoutClient
      physicianEmail={physician?.email ?? session.email ?? ""}
      initialAddress={initialAddress}
    />
  );
}

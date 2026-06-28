import { requirePhysician } from "@/lib/auth/dal";
import { prisma }           from "@/lib/db/prisma";
import { PhysicianAccountClient } from "@/components/physician/account-client";

export const metadata = { title: "Account -“ Pronuvia" };

export default async function PhysicianAccountPage() {
  const session = await requirePhysician();

  const physician = await prisma.partneringPhysician.findUnique({
    where: { id: session.userId },
    select: {
      firstName: true, lastName: true, email: true,
      phone: true, officeContactNumber: true, fax: true,
      nameOfPractice: true, license: true, yearsInPractice: true,
      aictherapy: true, websiteLink: true, fieldsOfSpeciality: true,
      addressOne: true, addressTwo: true, city: true, state: true, zipCode: true,
      bankName: true, bankAccountName: true, bankAccountNumber: true, swiftCode: true,
      commission: true, uplineCommission: true,
      isApproved: true, createdAt: true,
      salesRep: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!physician) return <div className="text-gray-500">Account not found.</div>;

  return <PhysicianAccountClient physician={physician} />;
}

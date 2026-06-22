import { requirePhysician } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";

export const metadata = { title: "Account Details – Pronuvia" };

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  const display = value !== null && value !== undefined && value !== ""
    ? String(value)
    : null;
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800">
        {display ?? <span className="text-gray-300 italic text-xs">Not provided</span>}
      </dd>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-5 pb-3 border-b border-gray-100">{title}</h2>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">{children}</dl>
    </div>
  );
}

const approvalStyle = {
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING:  "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default async function PhysicianAccountPage() {
  const session = await requirePhysician();

  const physician = await prisma.partneringPhysician.findUnique({
    where: { id: session.userId },
    include: {
      salesRep: { select: { firstName: true, lastName: true, email: true, phone: true } },
    },
  });

  if (!physician) return <div className="text-gray-500">Account not found.</div>;

  const fullAddress = [
    physician.addressOne,
    physician.addressTwo,
    physician.city,
    physician.state,
    physician.zipCode,
  ].filter(Boolean).join(", ");

  const memberSince = new Date(physician.createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  const statusCls = approvalStyle[physician.isApproved];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Account Details</h1>
        <p className="text-sm text-gray-400 mt-0.5">Your Pronuvia physician profile</p>
      </div>

      {/* Avatar + identity */}
      <div className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5BB8D4] to-[#3a90a8] flex items-center justify-center shrink-0">
          <span className="text-2xl font-black text-white">
            {physician.firstName.charAt(0)}{physician.lastName.charAt(0)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-gray-900">
            Dr. {physician.firstName} {physician.lastName}
          </p>
          <p className="text-sm text-gray-400">{physician.email}</p>
          {physician.nameOfPractice && (
            <p className="text-xs text-gray-400 mt-0.5">{physician.nameOfPractice}</p>
          )}
          <p className="text-xs text-gray-300 mt-0.5">Member since {memberSince}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          <span className={`inline-flex px-3 py-1.5 border rounded-full text-xs font-semibold ${statusCls}`}>
            {physician.isApproved.charAt(0) + physician.isApproved.slice(1).toLowerCase()}
          </span>
          <span className="inline-flex px-3 py-1.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-xs font-semibold">
            {physician.commission}% commission
          </span>
        </div>
      </div>

      {/* Approval notice */}
      {physician.isApproved === "PENDING" && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-amber-800">Account pending approval</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your account is awaiting review by the admin. You will receive access once approved.
            </p>
          </div>
        </div>
      )}

      {/* Personal info */}
      <Card title="Personal Information">
        <InfoRow label="First Name" value={physician.firstName} />
        <InfoRow label="Last Name"  value={physician.lastName} />
        <InfoRow label="Email"      value={physician.email} />
        <InfoRow label="Phone"      value={physician.phone} />
        <InfoRow label="Office Phone" value={physician.officeContactNumber} />
        <InfoRow label="Fax"        value={physician.fax} />
      </Card>

      {/* Practice */}
      <Card title="Practice Information">
        <InfoRow label="Practice Name"    value={physician.nameOfPractice} />
        <InfoRow label="License Number"   value={physician.license} />
        <InfoRow label="Years in Practice" value={physician.yearsInPractice} />
        <InfoRow label="AIC Therapy"      value={physician.aictherapy} />
        <InfoRow label="Website"          value={physician.websiteLink} />
        <div className="col-span-2">
          <InfoRow label="Fields of Specialty" value={physician.fieldsOfSpeciality?.join(", ")} />
        </div>
        <div className="col-span-2">
          <InfoRow label="Address" value={fullAddress || null} />
        </div>
      </Card>

      {/* Commission */}
      <Card title="Commission Details">
        <InfoRow label="Commission Rate"         value={`${physician.commission}%`} />
        <InfoRow label="Upline Commission Rate"  value={`${physician.uplineCommission}%`} />
        <InfoRow label="Total Orders"            value={physician.ordersCount} />
        <InfoRow label="Added By"                value={physician.addedByRole.replace("_", " ")} />
      </Card>

      {/* Upline sales rep */}
      {physician.salesRep && (
        <Card title="Upline Sales Representative">
          <InfoRow label="Name"  value={`${physician.salesRep.firstName} ${physician.salesRep.lastName}`} />
          <InfoRow label="Email" value={physician.salesRep.email} />
          <InfoRow label="Phone" value={physician.salesRep.phone} />
        </Card>
      )}
    </div>
  );
}

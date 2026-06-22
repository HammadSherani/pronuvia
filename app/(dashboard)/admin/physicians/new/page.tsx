import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { adminCreatePhysician } from "@/actions/admin/manage-physicians";
import { PhysicianForm } from "@/components/admin/physician-form";

export const metadata = { title: "Add Physician – Pronuvia Admin" };

export default async function NewPhysicianPage() {
  await requireAdmin();

  return (
    <div className="max-w-3xl">
      <Link href="/admin/physicians"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Physicians
      </Link>

      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Add Partnering Physician</h1>
          <p className="text-sm text-gray-500 mt-0.5">Physicians added by admin are automatically approved and can log in immediately.</p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Auto-Approved
        </span>
      </div>

      <PhysicianForm
        action={adminCreatePhysician}
        submitLabel="Create & Approve"
        backHref="/admin/physicians"
        successRedirect="/admin/physicians"
      />
    </div>
  );
}

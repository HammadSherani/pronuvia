import Link from "next/link";
import { listPhysicians, deletePhysician } from "@/actions/admin/manage-physicians";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { ApprovalStatus } from "@/app/generated/prisma/enums";

export const metadata = { title: "Physicians – Pronuvia Admin" };

const statusBadge: Record<ApprovalStatus, { label: string; cls: string }> = {
  APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
};

export default async function PhysiciansPage() {
  const physicians = await listPhysicians();

  return (
    <div>
      <PageHeader
        title="Partnering Physicians"
        description="Manage physician accounts — admin-added physicians are auto-approved"
        actionLabel="Add Physician"
        actionHref="/admin/physicians/new"
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {physicians.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No physicians yet</p>
            <Link href="/admin/physicians/new" className="mt-3 text-sm text-[#3DBFA4] hover:underline font-medium">
              Add your first physician
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/60">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Physician</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Practice</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {physicians.map((p) => {
                const badge = statusBadge[p.isApproved];
                return (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#5BB8D4]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-[#5BB8D4]">
                            {p.firstName[0]}{p.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Dr. {p.firstName} {p.lastName}</p>
                          <p className="text-xs text-gray-400">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{p.nameOfPractice ?? "—"}</td>
                    <td className="px-5 py-3.5 text-gray-500">{p.phone ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        {p.commission}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(p.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-4 justify-end">
                        <Link href={`/admin/physicians/${p.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                          View
                        </Link>
                        <Link href={`/admin/physicians/${p.id}/edit`} className="text-xs font-medium text-[#5BB8D4] hover:text-[#3a9db8] transition-colors">
                          Edit
                        </Link>
                        <DeleteButton
                          action={deletePhysician.bind(null, p.id)}
                          modalTitle="Delete this physician?"
                          modalDescription={`Dr. ${p.firstName} ${p.lastName}'s account will be permanently removed and they will no longer be able to log in.`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

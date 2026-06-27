import Link from "next/link";
import { listSalesReps, deleteSalesRep } from "@/actions/admin/manage-sales-reps";
import { PageHeader } from "@/components/admin/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { Pagination } from "@/components/shared/pagination";
import { parsePagination } from "@/lib/pagination";
import { Suspense } from "react";

export const metadata = { title: "Sales Representatives – Pronuvia Admin" };

export default async function SalesRepsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const { page, pageSize, skip, take } = parsePagination(sp);
  const { reps, total } = await listSalesReps({ skip, take });

  return (
    <div>
      <PageHeader
        title="Sales Representatives"
        description={`Manage your sales team accounts (${total} total)`}
        actionLabel="Add Sales Rep"
        actionHref="/admin/sales-reps/new"
      />

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-500">No sales representatives yet</p>
            <Link href="/admin/sales-reps/new" className="mt-3 text-sm text-[#3DBFA4] hover:underline font-medium">
              Add your first sales rep
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Commission</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Added</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {reps.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-semibold text-[#3DBFA4]">
                            {r.firstName[0]}{r.lastName[0]}
                          </span>
                        </div>
                        <span className="font-medium text-gray-800">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500">{r.email}</td>
                    <td className="px-5 py-3.5 text-gray-500">{r.phone ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                        {r.commission}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-600">{r.ordersCount}</td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-4 justify-end">
                        <Link href={`/admin/sales-reps/${r.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors">
                          View
                        </Link>
                        <Link href={`/admin/sales-reps/${r.id}/edit`} className="text-xs font-medium text-[#5BB8D4] hover:text-[#3a9db8] transition-colors">
                          Edit
                        </Link>
                        <DeleteButton
                          action={deleteSalesRep.bind(null, r.id)}
                          modalTitle="Delete this sales rep?"
                          modalDescription={`${r.name}'s account will be permanently removed and they will no longer be able to log in.`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Suspense>
              <Pagination total={total} page={page} pageSize={pageSize} />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { deletePhysician, updateUplineCommission, updateDoctorCommission } from "@/actions/admin/manage-physicians";
import { updateSalesRepCommission } from "@/actions/admin/manage-sales-reps";
import { DeleteButton } from "@/components/admin/delete-button";
import { CommissionEditor } from "@/components/admin/commission-editor";
import { SalesRepAccordionList } from "@/components/admin/sales-rep-accordion";
import { ApprovalStatus } from "@/app/generated/prisma/enums";

// ─── Types ────────────────────────────────────────────────────────────────────

type Physician = {
  id: string; isApproved: ApprovalStatus;
  firstName: string; lastName: string; email: string;
  nameOfPractice: string | null; phone: string | null;
  commission: number; uplineCommission: number;
  addedByRole: string; salesRepId: string | null;
  salesRep: { id: string; name: string; email: string; commission: number } | null;
  createdAt: Date;
};

type SalesRep = {
  id: string; firstName: string; lastName: string;
  email: string; phone: string | null;
  commission: number; walletBalance: number | null; createdAt: Date;
  physicians: {
    id: string; firstName: string; lastName: string;
    email: string; nameOfPractice: string | null;
    commission: number; uplineCommission: number;
  }[];
};

type Order = {
  id: string; orderNumber: string; createdAt: Date;
  salesRepId: string | null; physicianId: string | null;
  salesRepCommissionAmount: number; physicianCommissionAmount: number;
  commissionPaid: boolean; status: string;
  salesRep: { firstName: string; lastName: string } | null;
  physician: { firstName: string; lastName: string } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge: Record<ApprovalStatus, { label: string; cls: string }> = {
  APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
};

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function match(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ─── Payout badge ─────────────────────────────────────────────────────────────

function PayoutBadge({ commissionPaid, salesRepId, pendingSet }: {
  commissionPaid: boolean; salesRepId: string | null; pendingSet: Set<string>;
}) {
  if (commissionPaid) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-semibold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Paid
      </span>
    );
  }
  if (salesRepId && pendingSet.has(salesRepId)) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[10px] font-semibold">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Requested
      </span>
    );
  }
  return (
    <span className="inline-flex px-2 py-0.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-full text-[10px] font-semibold">
      Unpaid
    </span>
  );
}

// ─── Doctor table row (inline-editable) ───────────────────────────────────────

function DoctorTableRow({ p }: { p: Physician }) {
  const badge = statusBadge[p.isApproved];

  const handleDoctorCommission = async (v: number) => {
    const res = await updateDoctorCommission(p.id, v);
    if (res?.success) toast.success("Doctor commission updated");
    else toast.error(res?.message ?? "Failed");
  };

  const handleRepCommission = async (v: number) => {
    if (!p.salesRep) return;
    const res = await updateSalesRepCommission(p.salesRep.id, v);
    if (res?.success) toast.success("Sales rep commission updated");
    else toast.error(res?.message ?? "Failed");
  };

  const handleUplineCommission = async (v: number) => {
    const res = await updateUplineCommission(p.id, v);
    if (res?.success) toast.success("Upline commission updated");
    else toast.error(res?.message ?? "Failed");
  };

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      {/* Doctor */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#5BB8D4]/10 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-[#5BB8D4]">{p.firstName[0]}{p.lastName[0]}</span>
          </div>
          <div>
            <p className="font-medium text-gray-800">Dr. {p.firstName} {p.lastName}</p>
            <p className="text-xs text-gray-400">{p.email}</p>
          </div>
        </div>
      </td>

      {/* Practice */}
      <td className="px-5 py-3.5 text-gray-500 text-xs">{p.nameOfPractice ?? "—"}</td>

      {/* Upline Sales Rep */}
      <td className="px-5 py-3.5">
        {p.salesRep ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-[#3DBFA4]">
                {p.salesRep.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-800">{p.salesRep.name}</p>
              <p className="text-[10px] text-gray-400">{p.salesRep.email}</p>
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-300 italic">No rep assigned</span>
        )}
      </td>

      {/* Doctor Commission % */}
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400 leading-none">Doctor gets</span>
          <CommissionEditor
            value={p.commission}
            label="doctor commission"
            onSave={handleDoctorCommission}
            badgeColor="blue"
          />
        </div>
      </td>

      {/* Upline commission (rep earns per this doctor's orders) */}
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] text-gray-400 leading-none">Rep gets (via this dr.)</span>
          <CommissionEditor
            value={p.uplineCommission}
            label="rep upline commission"
            onSave={handleUplineCommission}
          />
        </div>
      </td>

      {/* Sales Rep global commission */}
      <td className="px-5 py-3.5">
        {p.salesRep ? (
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-gray-400 leading-none">Rep base rate</span>
            <CommissionEditor
              value={p.salesRep.commission}
              label="sales rep base commission"
              onSave={handleRepCommission}
              badgeColor="emerald"
            />
          </div>
        ) : (
          <span className="text-xs text-gray-300">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <span className={`inline-flex px-2 py-0.5 border rounded-full text-xs font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3 justify-end">
          <Link href={`/admin/physicians/${p.id}`} className="text-xs font-medium text-gray-500 hover:text-gray-700">View</Link>
          <Link href={`/admin/physicians/${p.id}/edit`} className="text-xs font-medium text-[#5BB8D4] hover:text-[#3a9db8]">Edit</Link>
          <DeleteButton
            action={deletePhysician.bind(null, p.id)}
            modalTitle="Delete this physician?"
            modalDescription={`Dr. ${p.firstName} ${p.lastName}'s account will be permanently removed.`}
          />
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PhysiciansPageClient({
  physicians, salesReps, recentOrders, pendingRepIds,
}: {
  physicians:    Physician[];
  salesReps:     SalesRep[];
  recentOrders:  Order[];
  pendingRepIds: string[];
}) {
  const [query, setQuery] = useState("");

  const pendingSet = useMemo(() => new Set(pendingRepIds), [pendingRepIds]);

  const filteredPhysicians = useMemo(() => {
    if (!query.trim()) return physicians;
    const q = query.trim();
    return physicians.filter(
      (p) =>
        match(`${p.firstName} ${p.lastName}`, q) ||
        match(p.email, q) ||
        match(p.id, q) ||
        (p.nameOfPractice && match(p.nameOfPractice, q)) ||
        (p.salesRep && match(p.salesRep.name, q)),
    );
  }, [query, physicians]);

  const filteredReps = useMemo(() => {
    if (!query.trim()) return salesReps;
    const q = query.trim();
    return salesReps.filter(
      (r) =>
        match(`${r.firstName} ${r.lastName}`, q) ||
        match(r.email, q) ||
        match(r.id, q) ||
        r.physicians.some(
          (p) =>
            match(`${p.firstName} ${p.lastName}`, q) ||
            match(p.email, q) ||
            (p.nameOfPractice ? match(p.nameOfPractice, q) : false),
        ),
    );
  }, [query, salesReps]);

  const isSearching = query.trim().length > 0;

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Physicians &amp; Sales Reps</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage doctors, downline structure, and commission rates</p>
        </div>
        <Link
          href="/admin/physicians/new"
          className="inline-flex items-center gap-2 bg-[#3DBFA4] hover:bg-[#35ab93] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Physician
        </Link>
      </div>

      {/* ── Global Search Bar ── */}
      <div className="relative mb-6">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search doctors or sales reps by name, email, or ID…"
          className="w-full pl-10 pr-10 py-3 text-sm bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3DBFA4]/40 focus:border-[#3DBFA4] transition-colors placeholder:text-gray-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isSearching && (
        <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#5BB8D4]" />
            {filteredPhysicians.length} doctor{filteredPhysicians.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3DBFA4]" />
            {filteredReps.length} sales rep{filteredReps.length !== 1 ? "s" : ""}
          </span>
          <span className="text-gray-300">for "{query}"</span>
        </div>
      )}

      {/* ── Doctor List ── */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#5BB8D4]" />
          Partnering Doctors
          <span className="text-gray-300 font-normal normal-case tracking-normal">({filteredPhysicians.length})</span>
        </h2>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
          {filteredPhysicians.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <p className="text-sm font-medium text-gray-400">
                {isSearching ? `No doctors match "${query}"` : "No physicians yet"}
              </p>
              {!isSearching && (
                <Link href="/admin/physicians/new" className="mt-2 text-sm text-[#3DBFA4] hover:underline font-medium">
                  Add your first physician
                </Link>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Practice</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Upline Sales Rep</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor Commission</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rep via This Dr.</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rep Base Rate</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredPhysicians.map((p) => (
                  <DoctorTableRow key={p.id} p={p} />
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Legend */}
        {filteredPhysicians.length > 0 && (
          <div className="flex items-center gap-5 mt-2 px-1 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#5BB8D4]/20 border border-[#5BB8D4]/30" />
              Doctor Commission — what the doctor earns
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-violet-100 border border-violet-200" />
              Rep via This Dr. — upline rate for orders through this specific doctor
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-100 border border-emerald-200" />
              Rep Base Rate — rep's global commission rate
            </span>
          </div>
        )}
      </div>

      {/* ── Sales Representatives Accordion ── */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#3DBFA4]" />
          Sales Representatives
          <span className="text-gray-300 font-normal normal-case tracking-normal">({filteredReps.length})</span>
          {!isSearching && (
            <span className="text-gray-400 font-normal normal-case tracking-normal text-[10px]">
              — click row to expand downline doctors
            </span>
          )}
        </h2>
        <SalesRepAccordionList salesReps={filteredReps} searchQuery={query} />
      </div>

      {/* ── Recent Commissions ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            Recent Commissions
          </h2>
          <span className="text-xs text-gray-400">{recentOrders.length} orders</span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {recentOrders.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400">No commission activity yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order #</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order By</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sales Rep Commission</th>
                  <th className="text-right px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor Commission</th>
                  <th className="text-center px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Payout Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/orders/${o.id}`} className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-1 rounded-lg hover:bg-gray-200 transition-colors">
                        #{o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {o.salesRep ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-[#3DBFA4]">{o.salesRep.firstName[0]}{o.salesRep.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">{o.salesRep.firstName} {o.salesRep.lastName}</p>
                            <span className="inline-flex px-1.5 bg-[#3DBFA4]/10 text-[#3DBFA4] rounded text-[9px] font-bold uppercase">Sales Rep</span>
                          </div>
                        </div>
                      ) : o.physician ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#5BB8D4]/10 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-bold text-[#5BB8D4]">{o.physician.firstName[0]}{o.physician.lastName[0]}</span>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-800">Dr. {o.physician.firstName} {o.physician.lastName}</p>
                            <span className="inline-flex px-1.5 bg-[#5BB8D4]/10 text-[#5BB8D4] rounded text-[9px] font-bold uppercase">Doctor</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">Admin</p>
                            <span className="inline-flex px-1.5 bg-gray-100 text-gray-500 rounded text-[9px] font-bold uppercase">Admin</span>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {o.salesRepCommissionAmount > 0
                        ? <span className="text-sm font-bold text-emerald-600">{fmt(o.salesRepCommissionAmount)}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {o.physicianCommissionAmount > 0
                        ? <span className="text-sm font-bold text-[#5BB8D4]">{fmt(o.physicianCommissionAmount)}</span>
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <PayoutBadge commissionPaid={o.commissionPaid} salesRepId={o.salesRepId} pendingSet={pendingSet} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

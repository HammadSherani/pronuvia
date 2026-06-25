"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { deletePhysician } from "@/actions/admin/manage-physicians";
import { DeleteButton } from "@/components/admin/delete-button";
import { PhysicianApprovalActions } from "@/components/admin/physician-approval-actions";
import { ApprovalStatus } from "@/generated/prisma/enums";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusBadge: Record<ApprovalStatus, { label: string; cls: string }> = {
  APPROVED: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
  REJECTED: { label: "Rejected", cls: "bg-red-50 text-red-700 border-red-200" },
};

function match(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}

// ─── Doctor table row ─────────────────────────────────────────────────────────

function DoctorTableRow({ p }: { p: Physician }) {
  const badge = statusBadge[p.isApproved];

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      {/* Doctor */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#5BB8D4]/10 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-semibold text-[#5BB8D4]">{p.firstName[0]}{p.lastName[0]}</span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-800 truncate">Dr. {p.firstName} {p.lastName}</p>
            <p className="text-[10px] text-gray-400 truncate">{p.email}</p>
          </div>
        </div>
      </td>

      {/* Practice */}
      <td className="px-3 py-3 text-gray-500 text-xs truncate">{p.nameOfPractice ?? "—"}</td>

      {/* Upline Sales Rep */}
      <td className="px-3 py-3">
        {p.salesRep ? (
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate">{p.salesRep.name}</p>
            <p className="text-[10px] text-gray-400 truncate">{p.salesRep.email}</p>
          </div>
        ) : (
          <span className="text-xs text-gray-300 italic">—</span>
        )}
      </td>

      {/* Status */}
      <td className="px-3 py-3">
        <span className={`inline-flex px-2 py-0.5 border rounded-full text-[10px] font-medium ${badge.cls}`}>
          {badge.label}
        </span>
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-2 justify-end flex-wrap">
          {p.isApproved === ApprovalStatus.PENDING && (
            <PhysicianApprovalActions
              physicianId={p.id}
              physicianName={`Dr. ${p.firstName} ${p.lastName}`}
              existingCommission={p.commission}
            />
          )}
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
  physicians,
}: {
  physicians: Physician[];
}) {
  const [query, setQuery] = useState("");

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

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[30%]">Doctor</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[22%]">Practice</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[24%]">Sales Rep</th>
                  <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[12%]">Status</th>
                  <th className="px-3 py-3 w-[12%]" />
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

      </div>

    </div>
  );
}


"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PhysicianActionState } from "@/actions/admin/manage-physicians";

type SalesRepOption = { id: string; name: string; email: string };

interface PhysicianFormProps {
  action: (state: PhysicianActionState, formData: FormData) => Promise<PhysicianActionState>;
  submitLabel: string;
  backHref: string;
  successRedirect?: string;
  isEdit?: boolean;
  salesReps?: SalesRepOption[];
  defaults?: {
    firstName?: string; lastName?: string; email?: string; phone?: string;
    officeContactNumber?: string; fax?: string;
    aictherapy?: string; license?: string; websiteLink?: string;
    addressOne?: string; addressTwo?: string; city?: string; state?: string; zipCode?: string;
    nameOfPractice?: string; yearsInPractice?: number;
    fieldsOfSpeciality?: string[]; commission?: number;
    uplineCommission?: number; salesRepId?: string;
    bankName?: string; bankAccountNumber?: string; bankAccountName?: string;
  };
}

const base   = "w-full border rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 transition bg-white";
const ok     = "border-gray-200 focus:border-[#3DBFA4] focus:ring-[#3DBFA4]";
const errCls = "border-red-300 focus:border-red-400 focus:ring-red-300";
const icls   = (e?: string) => `${base} ${e ? errCls : ok}`;
const sec    = "bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5";
const head   = "text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100";
const lbl    = "block text-sm font-medium text-gray-700 mb-1.5";

function FE({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;
}
function Req() { return <span className="text-red-400"> *</span>; }

const SPECIALTIES = [
  "Cardiology","Dermatology","Endocrinology","Family Medicine","Gastroenterology",
  "General Practice","Internal Medicine","Neurology","Obstetrics & Gynecology",
  "Oncology","Ophthalmology","Orthopedics","Pediatrics","Psychiatry",
  "Pulmonology","Radiology","Rheumatology","Surgery","Urology",
];

// ── Searchable Sales Rep dropdown ──────────────────────────────────
function SalesRepSearch({
  reps, selectedId, onChange,
}: { reps: SalesRepOption[]; selectedId: string; onChange: (id: string) => void }) {
  const [query, setQuery]   = useState("");
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);

  const selected = reps.find((r) => r.id === selectedId);

  // initialise display when default arrives
  useEffect(() => {
    if (selected && !query) setQuery("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const filtered = query.trim()
    ? reps.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.email.toLowerCase().includes(query.toLowerCase()) ||
          r.id.toLowerCase().includes(query.toLowerCase()),
      )
    : reps;

  function select(rep: SalesRepOption | null) {
    onChange(rep?.id ?? "");
    setQuery(rep ? rep.name : "");
    setOpen(false);
  }

  // close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // if nothing selected, reset display
        if (!selectedId) setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [selectedId]);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by name, email or ID…"
          className={`${base} ${ok} pl-9 pr-9`}
        />
        {selectedId && (
          <button type="button" onClick={() => select(null)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer">
            ×
          </button>
        )}
      </div>

      {/* Selected badge */}
      {selected && !open && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-[#3DBFA4]/8 border border-[#3DBFA4]/25 rounded-lg">
          <div className="w-6 h-6 rounded-full bg-[#3DBFA4]/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-[#3DBFA4]">{selected.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{selected.name}</p>
            <p className="text-xs text-gray-400 truncate">{selected.email}</p>
          </div>
          <span className="text-xs text-[#3DBFA4] font-medium shrink-0">Assigned</span>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {/* Clear option */}
          <button type="button" onClick={() => select(null)}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-400 hover:bg-gray-50 border-b border-gray-100 cursor-pointer">
            — No sales rep —
          </button>
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">No matches found</p>
          ) : (
            filtered.map((r) => (
              <button key={r.id} type="button" onClick={() => select(r)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center gap-3 transition-colors ${r.id === selectedId ? "bg-[#3DBFA4]/5" : ""}`}>
                <div className="w-7 h-7 rounded-full bg-[#3DBFA4]/15 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-[#3DBFA4]">{r.name[0]}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.name}</p>
                  <p className="text-xs text-gray-400 truncate">{r.email}</p>
                </div>
                {r.id === selectedId && (
                  <svg className="w-4 h-4 text-[#3DBFA4] ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main form ──────────────────────────────────────────────────────
export function PhysicianForm({
  action, submitLabel, backHref, successRedirect, isEdit, salesReps = [], defaults,
}: PhysicianFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();

  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>(defaults?.fieldsOfSpeciality ?? []);
  const [customSpecialty, setCustom]  = useState("");
  const [selectedRepId, setSelectedRepId] = useState(defaults?.salesRepId ?? "");

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success(state.message ?? "Saved successfully");
      if (successRedirect) router.push(successRedirect);
    } else if (state.message && !state.errors) {
      toast.error(state.message);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const e = state?.errors ?? {};

  function toggleSpecialty(s: string) {
    setSpecialties((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }
  function addCustom() {
    const v = customSpecialty.trim();
    if (v && !specialties.includes(v)) setSpecialties((p) => [...p, v]);
    setCustom("");
  }

  const eyeOff = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  );
  const eyeOn = (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="fieldsOfSpeciality" value={JSON.stringify(specialties)} />
      <input type="hidden" name="salesRepId"          value={selectedRepId} />

      {/* ── Hierarchy Settings ─────────────────────────────── */}
      <div className={sec}>
        <p className={head}>Hierarchy Settings</p>

        {/* Searchable rep selector */}
        <div className="mb-5">
          <label className={lbl}>
            Upline Sales Representative
            <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <SalesRepSearch
            reps={salesReps}
            selectedId={selectedRepId}
            onChange={setSelectedRepId}
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Search by name, email, or ID. Commission from this doctor&apos;s orders will be credited to the selected rep.
          </p>
        </div>

        {/* Commission fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>
              Doctor&apos;s Commission %
              <span className="ml-1.5 text-xs font-normal text-gray-400">earned on their own sales</span>
            </label>
            <div className="relative">
              <input name="commission" type="number" step="0.01" min="0" max="100"
                className={icls(e.commission?.[0])} placeholder="0.00"
                defaultValue={defaults?.commission ?? 0} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
            </div>
            <FE msg={e.commission?.[0]} />
          </div>
          <div>
            <label className={lbl}>
              Upline Commission %
              <span className="ml-1.5 text-xs font-normal text-gray-400">sales rep earns per order</span>
            </label>
            <div className="relative">
              <input name="uplineCommission" type="number" step="0.01" min="0" max="100"
                className={icls(e.uplineCommission?.[0])} placeholder="0.00"
                defaultValue={defaults?.uplineCommission ?? 0} />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
            </div>
            <FE msg={e.uplineCommission?.[0]} />
            <p className="text-xs text-gray-400 mt-1">
              This rate is locked per-doctor — different from the rep&apos;s global commission.
            </p>
          </div>
        </div>

        {/* Live preview */}
        {selectedRepId && (
          <div className="mt-4 p-3 bg-gray-50 border border-gray-100 rounded-lg text-xs text-gray-500 flex gap-6">
            <span>
              On a <strong className="text-gray-700">$1,000</strong> order:
            </span>
            <span>
              Doctor earns <strong className="text-[#8b5cf6]">commission %</strong>
            </span>
            <span>
              Sales rep earns <strong className="text-[#5BB8D4]">upline commission %</strong>
            </span>
            <span className="ml-auto text-gray-400">Both rates snapshot at order time</span>
          </div>
        )}
      </div>

      {/* ── Personal Info ─────────────────────────────────── */}
      <div className={sec}>
        <p className={head}>Personal Information</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>First Name<Req /></label>
            <input name="firstName" className={icls(e.firstName?.[0])} placeholder="Dr. Jane" defaultValue={defaults?.firstName} />
            <FE msg={e.firstName?.[0]} />
          </div>
          <div>
            <label className={lbl}>Last Name<Req /></label>
            <input name="lastName" className={icls(e.lastName?.[0])} placeholder="Doe" defaultValue={defaults?.lastName} />
            <FE msg={e.lastName?.[0]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>Email<Req /></label>
            <input name="email" type="email" className={icls(e.email?.[0])} placeholder="doctor@clinic.com" defaultValue={defaults?.email} />
            <FE msg={e.email?.[0]} />
          </div>
          <div>
            <label className={lbl}>Mobile Phone</label>
            <input name="phone" className={icls()} placeholder="+1 555 000 0000" defaultValue={defaults?.phone} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Office Contact Number</label>
            <input name="officeContactNumber" className={icls()} placeholder="+1 555 000 0001" defaultValue={defaults?.officeContactNumber} />
          </div>
          <div>
            <label className={lbl}>Fax</label>
            <input name="fax" className={icls()} placeholder="+1 555 000 0002" defaultValue={defaults?.fax} />
          </div>
        </div>
      </div>

      {/* ── Security (create only) ────────────────────────── */}
      {!isEdit && (
        <div className={sec}>
          <p className={head}>Security</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Password<Req /></label>
              <div className="relative">
                <input name="password" type={showPass ? "text" : "password"}
                  className={icls(e.password?.[0])} placeholder="Min 8 chars, letter, number, symbol" />
                <button type="button" onClick={() => setShowPass((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showPass ? eyeOff : eyeOn}
                </button>
              </div>
              <FE msg={e.password?.[0]} />
            </div>
            <div>
              <label className={lbl}>Confirm Password<Req /></label>
              <div className="relative">
                <input name="confirmPassword" type={showConfirm ? "text" : "password"}
                  className={icls(e.confirmPassword?.[0])} placeholder="Repeat password" />
                <button type="button" onClick={() => setShowConfirm((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                  {showConfirm ? eyeOff : eyeOn}
                </button>
              </div>
              <FE msg={e.confirmPassword?.[0]} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Min 8 characters · at least one letter, one number, and one special character.</p>
        </div>
      )}

      {/* ── Practice Info ─────────────────────────────────── */}
      <div className={sec}>
        <p className={head}>Practice Information</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>Name of Practice</label>
            <input name="nameOfPractice" className={icls()} placeholder="City Health Clinic" defaultValue={defaults?.nameOfPractice} />
          </div>
          <div>
            <label className={lbl}>Years in Practice</label>
            <input name="yearsInPractice" type="number" min="0" className={icls()} placeholder="10" defaultValue={defaults?.yearsInPractice} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>License Number</label>
            <input name="license" className={icls()} placeholder="LIC-000000" defaultValue={defaults?.license} />
          </div>
          <div>
            <label className={lbl}>AIC Therapy ID</label>
            <input name="aictherapy" className={icls()} placeholder="AIC-000" defaultValue={defaults?.aictherapy} />
          </div>
        </div>
        <div>
          <label className={lbl}>Website</label>
          <input name="websiteLink" type="url" className={icls(e.websiteLink?.[0])} placeholder="https://clinic.com" defaultValue={defaults?.websiteLink ?? ""} />
          <FE msg={e.websiteLink?.[0]} />
        </div>
      </div>

      {/* ── Address ───────────────────────────────────────── */}
      <div className={sec}>
        <p className={head}>Practice Address</p>
        <div className="mb-4">
          <label className={lbl}>Address Line 1</label>
          <input name="addressOne" className={icls()} placeholder="123 Medical Drive" defaultValue={defaults?.addressOne} />
        </div>
        <div className="mb-4">
          <label className={lbl}>Address Line 2</label>
          <input name="addressTwo" className={icls()} placeholder="Suite 400" defaultValue={defaults?.addressTwo} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>City</label>
            <input name="city" className={icls()} placeholder="Los Angeles" defaultValue={defaults?.city} />
          </div>
          <div>
            <label className={lbl}>State</label>
            <input name="state" className={icls()} placeholder="CA" defaultValue={defaults?.state} />
          </div>
          <div>
            <label className={lbl}>ZIP Code</label>
            <input name="zipCode" className={icls()} placeholder="90001" defaultValue={defaults?.zipCode} />
          </div>
        </div>
      </div>

      {/* ── Bank Details ──────────────────────────────────── */}
      <div className={sec}>
        <p className={head}>Bank / Payout Details</p>
        <div className="mb-4">
          <label className={lbl}>Bank Name</label>
          <input name="bankName" className={icls()} placeholder="e.g. Chase Bank" defaultValue={defaults?.bankName} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Account Number</label>
            <input name="bankAccountNumber" className={icls()} placeholder="000000000" defaultValue={defaults?.bankAccountNumber} />
          </div>
          <div>
            <label className={lbl}>Account Name</label>
            <input name="bankAccountName" className={icls()} placeholder="Jane Doe" defaultValue={defaults?.bankAccountName} />
          </div>
        </div>
      </div>

      {/* ── Specialties ───────────────────────────────────── */}
      <div className={sec}>
        <p className={head}>Fields of Speciality</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SPECIALTIES.map((s) => (
            <button key={s} type="button" onClick={() => toggleSpecialty(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                specialties.includes(s)
                  ? "bg-[#3DBFA4] text-white border-[#3DBFA4]"
                  : "bg-white text-gray-600 border-gray-200 hover:border-[#3DBFA4]"
              }`}>
              {s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={customSpecialty} onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            className={`${base} ${ok} flex-1`} placeholder="Add custom specialty and press Enter" />
          <button type="button" onClick={addCustom}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors cursor-pointer">
            Add
          </button>
        </div>
        {specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3DBFA4]/10 text-[#3DBFA4] text-xs rounded-full font-medium">
                {s}
                <button type="button" onClick={() => toggleSpecialty(s)}
                  className="hover:text-red-500 transition-colors cursor-pointer">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Actions ───────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="px-6 py-2.5 bg-[#3DBFA4] text-white text-sm font-medium rounded-lg hover:bg-[#35a993] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2">
          {pending && <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
          {pending ? "Saving…" : submitLabel}
        </button>
        <a href={backHref} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </a>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { PhysicianActionState } from "@/actions/admin/manage-physicians";

interface PhysicianFormProps {
  action: (state: PhysicianActionState, formData: FormData) => Promise<PhysicianActionState>;
  submitLabel: string;
  backHref: string;
  successRedirect?: string;
  hideCommission?: boolean;
  showNoteField?: boolean;
  defaults?: {
    firstName?: string; lastName?: string; email?: string; phone?: string;
    officeContactNumber?: string; fax?: string;
    aictherapy?: string; license?: string; websiteLink?: string;
    addressOne?: string; addressTwo?: string; city?: string; state?: string; zipCode?: string;
    nameOfPractice?: string; yearsInPractice?: number;
    fieldsOfSpeciality?: string[]; commission?: number;
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

// ── Main form ──────────────────────────────────────────────────────
export function PhysicianForm({
  action, submitLabel, backHref, successRedirect, hideCommission, showNoteField, defaults,
}: PhysicianFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();

  const [specialties, setSpecialties] = useState<string[]>(defaults?.fieldsOfSpeciality ?? []);
  const [customSpecialty, setCustom]  = useState("");

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

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="fieldsOfSpeciality" value={JSON.stringify(specialties)} />

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

      {/* ── Commission (admin only) ────────────────────────── */}
      {!hideCommission && (
        <div className={sec}>
          <p className={head}>Commission Settings</p>
          <div className="max-w-xs">
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
        </div>
      )}

      {/* ── Commission Note (sales rep only) ──────────────── */}
      {showNoteField && (
        <div className={sec}>
          <p className={head}>Commission Note</p>
          <div>
            <label className={lbl}>
              Suggested Commission
              <span className="ml-1.5 text-xs font-normal text-gray-400">(optional)</span>
            </label>
            <textarea
              name="salesRepNote"
              rows={3}
              className={`${base} ${ok} resize-none`}
              placeholder="e.g. Please set 15% commission for this doctor"
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Admin will review your note and set the final commission when approving.
            </p>
          </div>
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

"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  showDualCreate?: boolean;
  defaults?: {
    firstName?: string; lastName?: string; email?: string; phone?: string;
    officeContactNumber?: string; fax?: string;
    aictherapy?: string; license?: string; websiteLink?: string;
    addressOne?: string; addressTwo?: string; city?: string; state?: string; zipCode?: string;
    nameOfPractice?: string; yearsInPractice?: number;
    fieldsOfSpeciality?: string[]; commission?: number; uplineCommission?: number;
    salesRepName?: string;
    bankName?: string; bankAccountNumber?: string; bankAccountName?: string; swiftCode?: string;
  };
}

const base   = "w-full border rounded-lg px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-300 placeholder:text-gray-400 outline-none focus:ring-1 transition bg-white";
const ok     = "border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500 focus:border-gray-900 focus:ring-gray-900";
const errCls = "border-red-300 focus:border-red-400 focus:ring-red-300";
const icls   = (e?: string) => `${base} ${e ? errCls : ok}`;
const sec    = "bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 mb-5";
const head   = "text-sm font-semibold text-gray-700 dark:text-gray-200 mb-4 pb-3 border-b border-gray-100 dark:border-gray-700 dark:border-gray-700";
const lbl    = "block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1.5";

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

// -- Main form ------------------------------------------------------
export function PhysicianForm({
  action, submitLabel, backHref, successRedirect, hideCommission, showNoteField, showDualCreate, defaults,
}: PhysicianFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();

  const [specialties, setSpecialties] = useState<string[]>(defaults?.fieldsOfSpeciality ?? []);
  const [customSpecialty, setCustom] = useState("");
  const [accNum,        setAccNum]   = useState(defaults?.bankAccountNumber ?? "");
  const [confirmAccNum, setConfirmAccNum] = useState(defaults?.bankAccountNumber ?? "");
  const [accNumError,   setAccNumError]   = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  function validateAccNums(a: string, b: string) {
    if (b && a !== b) setAccNumError("Account numbers do not match");
    else setAccNumError("");
  }

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    if (accNum && accNum !== confirmAccNum) {
      e.preventDefault();
      setAccNumError("Account numbers do not match");
      return;
    }
    setAccNumError("");
  }

  function onAccNumChange(val: string) {
    setAccNum(val);
    if (confirmAccNum) setAccNumError(val !== confirmAccNum ? "Account numbers do not match" : "");
  }

  function onConfirmChange(val: string) {
    setConfirmAccNum(val);
    setAccNumError(val !== accNum ? "Account numbers do not match" : "");
  }

  return (
    <form ref={formRef} action={formAction} onSubmit={handleSubmit} noValidate>
      <input type="hidden" name="fieldsOfSpeciality" value={JSON.stringify(specialties)} />

      {/* -- Personal Info ----------------------------------- */}
      <div className={sec}>
        <p className={head}>Personal Information</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>First Name<Req /></label>
            <input name="firstName" className={icls(e.firstName?.[0])} placeholder="Dr. Jane" defaultValue={state?.values?.firstName ?? defaults?.firstName} />
            <FE msg={e.firstName?.[0]} />
          </div>
          <div>
            <label className={lbl}>Last Name<Req /></label>
            <input name="lastName" className={icls(e.lastName?.[0])} placeholder="Doe" defaultValue={state?.values?.lastName ?? defaults?.lastName} />
            <FE msg={e.lastName?.[0]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>Email<Req /></label>
            <input name="email" type="email" className={icls(e.email?.[0])} placeholder="doctor@clinic.com" defaultValue={state?.values?.email ?? defaults?.email} />
            <FE msg={e.email?.[0]} />
          </div>
          <div>
            <label className={lbl}>Mobile Phone</label>
            <input name="phone" className={icls()} placeholder="+1 555 000 0000" defaultValue={state?.values?.phone ?? defaults?.phone} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Office Contact Number</label>
            <input name="officeContactNumber" className={icls()} placeholder="+1 555 000 0001" defaultValue={state?.values?.officeContactNumber ?? defaults?.officeContactNumber} />
          </div>
          <div>
            <label className={lbl}>Fax <span className="font-normal text-gray-400">(Optional)</span></label>
            <input name="fax" className={icls()} placeholder="+1 555 000 0002" defaultValue={state?.values?.fax ?? defaults?.fax} />
          </div>
        </div>
      </div>

      {/* -- Commission (admin only) -------------------------- */}
      {!hideCommission && (
        <div className={sec}>
          <p className={head}>Commission Settings</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                Doctor&apos;s Commission %
                <span className="ml-1.5 text-xs font-normal text-gray-400">earned on their own orders</span>
              </label>
              <div className="relative">
                <input name="commission" type="number" step="0.01" min="0" max="100"
                  className={icls(e.commission?.[0])} placeholder="0.00"
                  defaultValue={state?.values?.commission ?? defaults?.commission ?? 0} />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
              </div>
              <FE msg={e.commission?.[0]} />
            </div>

            <div>
              <label className={lbl}>
                Sales Rep&apos;s Commission %
                {defaults?.salesRepName
                  ? <span className="ml-1.5 text-xs font-normal text-gray-400">earned by {defaults.salesRepName} on this doctor&apos;s orders</span>
                  : <span className="ml-1.5 text-xs font-normal text-gray-400">upline commission on this doctor&apos;s orders</span>
                }
              </label>
              <div className="relative">
                <input name="uplineCommission" type="number" step="0.01" min="0" max="100"
                  className={icls(e.uplineCommission?.[0])} placeholder="0.00"
                  defaultValue={state?.values?.uplineCommission ?? defaults?.uplineCommission ?? 0} />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
              </div>
              <FE msg={e.uplineCommission?.[0]} />
            </div>
          </div>
        </div>
      )}

      {/* -- Commission Note (sales rep only) ---------------- */}
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
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Admin will review your note and set the final commission when approving.
            </p>
          </div>
        </div>
      )}

      {/* -- Practice Info ----------------------------------- */}
      <div className={sec}>
        <p className={head}>Practice Information</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>Name of Practice</label>
            <input name="nameOfPractice" className={icls()} placeholder="City Health Clinic" defaultValue={state?.values?.nameOfPractice ?? defaults?.nameOfPractice} />
          </div>
          <div>
            <label className={lbl}>Years in Practice</label>
            <input name="yearsInPractice" type="number" min="0" className={icls()} placeholder="10" defaultValue={state?.values?.yearsInPractice ?? defaults?.yearsInPractice} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>License Number</label>
            <input name="license" className={icls()} placeholder="LIC-000000" defaultValue={state?.values?.license ?? defaults?.license} />
          </div>
          <div>
            <label className={lbl}>How did you hear about AIC Therapy? </label>
            <input name="aictherapy" className={icls()} placeholder="AIC-000" defaultValue={state?.values?.aictherapy ?? defaults?.aictherapy} />
          </div>
        </div>
        <div>
          <label className={lbl}>Website</label>
          <input name="websiteLink" type="url" className={icls(e.websiteLink?.[0])} placeholder="https://clinic.com" defaultValue={state?.values?.websiteLink ?? defaults?.websiteLink ?? ""} />
          <FE msg={e.websiteLink?.[0]} />
        </div>
      </div>

      {/* -- Address ----------------------------------------- */}
      <div className={sec}>
        <p className={head}>Practice Address</p>
        <div className="mb-4">
          <label className={lbl}>Address Line 1</label>
          <input name="addressOne" className={icls()} placeholder="123 Medical Drive" defaultValue={state?.values?.addressOne ?? defaults?.addressOne} />
        </div>
        <div className="mb-4">
          <label className={lbl}>Address Line 2</label>
          <input name="addressTwo" className={icls()} placeholder="Suite 400" defaultValue={state?.values?.addressTwo ?? defaults?.addressTwo} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={lbl}>City</label>
            <input name="city" className={icls()} placeholder="Los Angeles" defaultValue={state?.values?.city ?? defaults?.city} />
          </div>
          <div>
            <label className={lbl}>State</label>
            <input name="state" className={icls()} placeholder="CA" defaultValue={state?.values?.state ?? defaults?.state} />
          </div>
          <div>
            <label className={lbl}>ZIP Code</label>
            <input name="zipCode" className={icls()} placeholder="90001" defaultValue={state?.values?.zipCode ?? defaults?.zipCode} />
          </div>
        </div>
      </div>

      {/* -- Bank Details ------------------------------------ */}
      <div className={sec}>
        <p className={head}>Bank / Payout Details</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>Bank Name</label>
            <input name="bankName" className={icls()} placeholder="e.g. Chase Bank" defaultValue={state?.values?.bankName ?? defaults?.bankName} />
          </div>
          <div>
            <label className={lbl}>Swift Code</label>
            <input name="swiftCode" className={icls()} placeholder="e.g. CHASUS33" defaultValue={state?.values?.swiftCode ?? defaults?.swiftCode} />
          </div>
        </div>
        <div className="mb-4">
          <label className={lbl}>Account Name</label>
          <input name="bankAccountName" className={icls()} placeholder="Jane Doe" defaultValue={state?.values?.bankAccountName ?? defaults?.bankAccountName} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Account Number</label>
            <input name="bankAccountNumber" className={icls(accNumError)} placeholder="000000000"
              value={accNum} onChange={(e) => onAccNumChange(e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Confirm Account Number</label>
            <input className={icls(accNumError)} placeholder="Re-enter account number"
              value={confirmAccNum} onChange={(e) => onConfirmChange(e.target.value)} />
            {accNumError && <p className="text-xs text-red-500 mt-1">{accNumError}</p>}
          </div>
        </div>
      </div>

      {/* -- Specialties ------------------------------------- */}
      <div className={sec}>
        <p className={head}>Fields of Speciality</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {SPECIALTIES.map((s) => (
            <button key={s} type="button" onClick={() => toggleSpecialty(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                specialties.includes(s)
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-900"
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
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900/10 text-[#3DBFA4] text-xs rounded-full font-medium">
                {s}
                <button type="button" onClick={() => toggleSpecialty(s)}
                  className="hover:text-red-500 transition-colors cursor-pointer">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* -- Actions ----------------------------------------- */}
      <div className="flex items-center gap-3 flex-wrap">
        {showDualCreate ? (
          <>
            <button
              type="submit"
              name="approvalAction"
              value="approve"
              disabled={pending}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              {pending && <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
              Create &amp; Approve
            </button>
            <button
              type="submit"
              name="approvalAction"
              value="pending"
              disabled={pending}
              className="px-5 py-2.5 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              {pending && <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />}
              Create &amp; Pending Approval
            </button>
          </>
        ) : (
          <button type="submit" disabled={pending}
            className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2">
            {pending && <div className="w-3.5 h-3.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />}
            {pending ? "Saving…" : submitLabel}
          </button>
        )}
        <a href={backHref} className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 transition-colors">
          Cancel
        </a>
      </div>
    </form>
  );
}

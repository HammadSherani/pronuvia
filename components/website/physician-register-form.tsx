"use client";

import { useActionState, useEffect, useState } from "react";
import { registerPhysician, type RegisterPhysicianState } from "@/actions/website/register-physician";

const SPECIALTIES = [
  "Cardiology","Dermatology","Endocrinology","Family Medicine","Gastroenterology",
  "General Practice","Internal Medicine","Neurology","Obstetrics & Gynecology",
  "Oncology","Ophthalmology","Orthopedics","Pediatrics","Psychiatry",
  "Pulmonology","Radiology","Rheumatology","Surgery","Urology",
];


const inp    = "w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#3DBFA4] focus:ring-1 focus:ring-[#3DBFA4]/30 transition bg-white";
const inpErr = "w-full border border-red-400 rounded-lg px-3.5 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-300 transition bg-white";
const lbl    = "block text-xs font-semibold text-gray-600 mb-1.5";

function R() { return <span className="text-red-500"> *</span>; }

function Field({ label, req = true, error, children }: { label: string; req?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}{req && <R />}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function PhysicianRegisterForm() {
  const [state, action, pending] = useActionState<RegisterPhysicianState, FormData>(registerPhysician, undefined);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [terms, setTerms] = useState(false);

  const e = state?.errors ?? {};

  function toggleSpecialty(s: string) {
    setSpecialties((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  }

  useEffect(() => {
    if (state?.success) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [state]);

  if (state?.success) {
    return (
      <div className="py-16 text-center">
        <div className="w-20 h-20 rounded-full bg-[#3DBFA4]/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-[#3DBFA4]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
          </svg>
        </div>
        <h2 className="text-3xl font-normal text-gray-900 mb-3" style={{ fontFamily: "Georgia, serif" }}>
          Registration Submitted!
        </h2>
        <p className="text-gray-500 text-sm leading-relaxed max-w-md mx-auto">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="fieldsOfSpeciality" value={JSON.stringify(specialties)} />

      {state?.message && !state.success && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {state.message}
        </div>
      )}

      {/* Email + First Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Email" error={e.email?.[0]}>
          <input required name="email" type="email" placeholder="doctor@clinic.com" className={e.email ? inpErr : inp} />
        </Field>
        <Field label="First Name" error={e.firstName?.[0]}>
          <input required name="firstName" placeholder="Dr. Jane" className={e.firstName ? inpErr : inp} />
        </Field>
      </div>

      {/* Last Name + SAC Therapy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Last Name" error={e.lastName?.[0]}>
          <input required name="lastName" placeholder="Doe" className={e.lastName ? inpErr : inp} />
        </Field>
        <Field label="How did you hear about SAC Therapy?" error={e.aictherapy?.[0]}>
          <input required name="aictherapy" placeholder="e.g. Conference, Referral, Online..." className={e.aictherapy ? inpErr : inp} />
        </Field>
      </div>

      {/* License + Website */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Doctor's License Number" error={e.license?.[0]}>
          <input required name="license" placeholder="LIC-000000" className={e.license ? inpErr : inp} />
        </Field>
        <Field label="Office Website" error={e.websiteLink?.[0]}>
          <input required name="websiteLink" type="url" placeholder="https://yourclinic.com" className={e.websiteLink ? inpErr : inp} />
        </Field>
      </div>

      {/* Country */}
      <Field label="Country" error={e.country?.[0]}>
        <input required name="country" placeholder="e.g. United States" className={e.country ? inpErr : inp} />
      </Field>

      {/* Address */}
      <Field label="Address Line 1" error={e.addressOne?.[0]}>
        <input required name="addressOne" placeholder="123 Medical Drive" className={e.addressOne ? inpErr : inp} />
      </Field>
      <Field label="Address Line 2" req={false}>
        <input name="addressTwo" placeholder="Suite 400 (optional)" className={inp} />
      </Field>

      {/* City + State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City" error={e.city?.[0]}>
          <input required name="city" placeholder="e.g. Los Angeles" className={e.city ? inpErr : inp} />
        </Field>
        <Field label="State" error={e.state?.[0]}>
          <input required name="state" placeholder="e.g. California" className={e.state ? inpErr : inp} />
        </Field>
      </div>

      {/* Zip + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Zip Code" error={e.zipCode?.[0]}>
          <input required name="zipCode" placeholder="90001" className={e.zipCode ? inpErr : inp} />
        </Field>
        <Field label="Phone" error={e.phone?.[0]}>
          <input required name="phone" type="tel" placeholder="+1 555 000 0000" className={e.phone ? inpErr : inp} />
        </Field>
      </div>

      {/* Office Contact + Fax */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Office Contact Person" error={e.officeContactNumber?.[0]}>
          <input required name="officeContactNumber" placeholder="Office contact number" className={e.officeContactNumber ? inpErr : inp} />
        </Field>
        <Field label="Fax" error={e.fax?.[0]}>
          <input required name="fax" placeholder="+1 555 000 0002" className={e.fax ? inpErr : inp} />
        </Field>
      </div>

      {/* Practice Name + Years */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name of Practice" error={e.nameOfPractice?.[0]}>
          <input required name="nameOfPractice" placeholder="City Health Clinic" className={e.nameOfPractice ? inpErr : inp} />
        </Field>
        <Field label="Number of Years in Practice" error={e.yearsInPractice?.[0]}>
          <input required name="yearsInPractice" type="number" min="0" placeholder="10" className={e.yearsInPractice ? inpErr : inp} />
        </Field>
      </div>

      {/* Specialties */}
      <div>
        <label className={lbl}>Preferred Specialties<R /></label>
        <div className="flex flex-wrap gap-2 mt-1">
          {SPECIALTIES.map((s) => (
            <button key={s} type="button" onClick={() => toggleSpecialty(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                specialties.includes(s)
                  ? "bg-[#3DBFA4] text-white border-[#3DBFA4]"
                  : "bg-white text-gray-600 border-gray-300 hover:border-[#3DBFA4]"
              }`}>
              {s}
            </button>
          ))}
        </div>
        {(e as Record<string, string[]>).fieldsOfSpeciality?.[0] && (
          <p className="text-xs text-red-500 mt-1">{(e as Record<string, string[]>).fieldsOfSpeciality[0]}</p>
        )}
        {specialties.length > 0 && (
          <p className="text-xs text-[#3DBFA4] mt-2">{specialties.length} selected: {specialties.join(", ")}</p>
        )}
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={terms} onChange={(ev) => setTerms(ev.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#3DBFA4] cursor-pointer" />
        <span className="text-sm text-gray-600">
          I agree to the{" "}
          <a href="#" className="text-[#3DBFA4] hover:underline">Terms and Conditions</a>{" "}
          and{" "}
          <a href="#" className="text-[#3DBFA4] hover:underline">Privacy Policy</a>
        </span>
      </label>

      <button type="submit" disabled={pending || !terms}
        className="w-full py-3 bg-[#3DBFA4] hover:bg-[#35a993] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2">
        {pending && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
        {pending ? "Submitting…" : "Submit Registration"}
      </button>
    </form>
  );
}

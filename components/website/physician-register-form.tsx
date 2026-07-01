"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Country, State } from "country-state-city";
import { registerPhysician, type RegisterPhysicianState } from "@/actions/website/register-physician";

const ALL_COUNTRIES = Country.getAllCountries();

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
  const [customSpecialty, setCustomSpecialty] = useState("");
  const [terms, setTerms] = useState(false);
  const [countryIso, setCountryIso] = useState("US");

  const states = useMemo(() => State.getStatesOfCountry(countryIso), [countryIso]);
  const countryName = useMemo(
    () => ALL_COUNTRIES.find((c) => c.isoCode === countryIso)?.name ?? "",
    [countryIso]
  );

  const e = state?.errors ?? {};

  function toggleSpecialty(s: string) {
    setSpecialties((p) => p.includes(s) ? p.filter((x) => x !== s) : [...p, s]);
  }

  function addCustomSpecialty() {
    const v = customSpecialty.trim();
    if (v && !specialties.includes(v)) setSpecialties((p) => [...p, v]);
    setCustomSpecialty("");
  }

  useEffect(() => {
    if (state?.success) window.scrollTo({ top: 0, behavior: "smooth" });
    if (state?.values?.country) {
      const match = ALL_COUNTRIES.find((c) => c.name === state.values!.country);
      if (match) setCountryIso(match.isoCode);
    }
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
          <input required name="email" type="email" placeholder="doctor@clinic.com" defaultValue={state?.values?.email} className={e.email ? inpErr : inp} />
        </Field>
        <Field label="First Name" error={e.firstName?.[0]}>
          <input required name="firstName" placeholder=" Jane" defaultValue={state?.values?.firstName} className={e.firstName ? inpErr : inp} />
        </Field>
      </div>

      {/* Last Name + SAC Therapy */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Last Name" error={e.lastName?.[0]}>
          <input required name="lastName" placeholder="Doe" defaultValue={state?.values?.lastName} className={e.lastName ? inpErr : inp} />
        </Field>
        <Field label="How did you hear about AIC Therapy?" error={e.aictherapy?.[0]}>
          <input required name="aictherapy" placeholder="e.g. Conference, Referral, Online..." defaultValue={state?.values?.aictherapy} className={e.aictherapy ? inpErr : inp} />
        </Field>
      </div>

      {/* License + Website */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Doctor's License Number" error={e.license?.[0]}>
          <input required name="license" placeholder="LIC-000000" defaultValue={state?.values?.license} className={e.license ? inpErr : inp} />
        </Field>
        <Field label="Website" req={false} error={e.websiteLink?.[0]}>
          <input name="websiteLink" placeholder="www.yourclinic.com" defaultValue={state?.values?.websiteLink} className={e.websiteLink ? inpErr : inp} />
        </Field>
      </div>

      {/* Country — hidden real name field + visible iso select */}
      <Field label="Country" error={e.country?.[0]}>
        <input type="hidden" name="country" value={countryName} />
        <select
          value={countryIso}
          onChange={(ev) => { setCountryIso(ev.target.value); }}
          className={e.country ? inpErr : inp}
        >
          {ALL_COUNTRIES.map((c) => (
            <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
          ))}
        </select>
      </Field>

      {/* Address */}
      <Field label="Address Line 1" error={e.addressOne?.[0]}>
        <input required name="addressOne" placeholder="123 Medical Drive" defaultValue={state?.values?.addressOne} className={e.addressOne ? inpErr : inp} />
      </Field>
      <Field label="Address Line 2" req={false}>
        <input name="addressTwo" placeholder="Suite 400 (optional)" defaultValue={state?.values?.addressTwo} className={inp} />
      </Field>

      {/* City + State */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="City" error={e.city?.[0]}>
          <input required name="city" placeholder="e.g. Los Angeles" defaultValue={state?.values?.city} className={e.city ? inpErr : inp} />
        </Field>
        <Field label="State / Province" error={e.state?.[0]}>
          {states.length > 0 ? (
            <select name="state" defaultValue={state?.values?.state ?? ""} className={e.state ? inpErr : inp}>
              <option value="" disabled>Select state…</option>
              {states.map((s) => (
                <option key={s.isoCode} value={s.name}>{s.name}</option>
              ))}
            </select>
          ) : (
            <input name="state" placeholder="State / Province / Region" defaultValue={state?.values?.state} className={e.state ? inpErr : inp} />
          )}
        </Field>
      </div>

      {/* Zip + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Zip Code" error={e.zipCode?.[0]}>
          <input required name="zipCode" placeholder="90001" defaultValue={state?.values?.zipCode} className={e.zipCode ? inpErr : inp} />
        </Field>
        <Field label="Phone" error={e.phone?.[0]}>
          <input required name="phone" type="tel" placeholder="+1 555 000 0000" defaultValue={state?.values?.phone} className={e.phone ? inpErr : inp} />
        </Field>
      </div>

      {/* Office Contact + Fax */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Office Contact Person" error={e.officeContactNumber?.[0]}>
          <input required name="officeContactNumber" placeholder="Office contact number" defaultValue={state?.values?.officeContactNumber} className={e.officeContactNumber ? inpErr : inp} />
        </Field>
        <Field label="Fax" req={false} error={e.fax?.[0]}>
          <input name="fax" placeholder="+1 555 000 0002" defaultValue={state?.values?.fax} className={e.fax ? inpErr : inp} />
        </Field>
      </div>

      {/* Practice Name + Years */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name of Practice" error={e.nameOfPractice?.[0]}>
          <input required name="nameOfPractice" placeholder="City Health Clinic" defaultValue={state?.values?.nameOfPractice} className={e.nameOfPractice ? inpErr : inp} />
        </Field>
        <Field label="Number of Years in Practice" error={e.yearsInPractice?.[0]}>
          <input required name="yearsInPractice" type="number" min="0" placeholder="10" defaultValue={state?.values?.yearsInPractice} className={e.yearsInPractice ? inpErr : inp} />
        </Field>
      </div>

      {/* Specialties */}
      <div>
        <label className={lbl}>Fields of Specialties<R /></label>
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

        {/* Custom specialty */}
        <div className="flex gap-2 mt-3">
          <input
            value={customSpecialty}
            onChange={(ev) => setCustomSpecialty(ev.target.value)}
            onKeyDown={(ev) => { if (ev.key === "Enter") { ev.preventDefault(); addCustomSpecialty(); } }}
            placeholder="Add custom specialty and press Enter"
            className={`${inp} flex-1`}
          />
          <button
            type="button"
            onClick={addCustomSpecialty}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Add
          </button>
        </div>

        {(e as Record<string, string[]>).fieldsOfSpeciality?.[0] && (
          <p className="text-xs text-red-500 mt-1">{(e as Record<string, string[]>).fieldsOfSpeciality[0]}</p>
        )}
        {specialties.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {specialties.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#3DBFA4]/10 text-[#3DBFA4] text-xs rounded-full font-medium">
                {s}
                <button type="button" onClick={() => toggleSpecialty(s)} className="hover:text-red-500 transition-colors">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Terms */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input type="checkbox" checked={terms} onChange={(ev) => setTerms(ev.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#3DBFA4] cursor-pointer" />
        <span className="text-sm text-gray-600">
          I agree to the{" "}
          <a href="/terms" target="_blank" className="text-[#3DBFA4] hover:underline">Terms and Conditions</a>
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

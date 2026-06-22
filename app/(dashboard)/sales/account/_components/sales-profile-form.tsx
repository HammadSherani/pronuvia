"use client";

import { useActionState } from "react";
import { updateSalesRepProfile } from "@/actions/sales-rep/profile";

type Rep = {
  firstName: string; lastName: string; email: string;
  phone?: string | null; website?: string | null;
  billingAddress?: string | null; shippingAddress?: string | null;
  bankName?: string | null; bankAccountName?: string | null; bankAccountNumber?: string | null;
};

function Field({
  label, name, defaultValue, type = "text", placeholder, error, readOnly,
}: {
  label: string; name: string; defaultValue?: string | null;
  type?: string; placeholder?: string; error?: string; readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        type={type} name={name} defaultValue={defaultValue ?? ""}
        placeholder={placeholder} readOnly={readOnly}
        className={`w-full px-3.5 py-2.5 text-sm border rounded-xl outline-none transition-colors ${
          readOnly
            ? "bg-gray-50 text-gray-400 cursor-default border-gray-100"
            : error
            ? "border-red-300 bg-red-50"
            : "border-gray-200 bg-gray-50 focus:border-[#3DBFA4] focus:bg-white"
        }`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

export function SalesProfileForm({ rep }: { rep: Rep }) {
  const [state, action, pending] = useActionState(updateSalesRepProfile, undefined);

  return (
    <form action={action} className="space-y-6">
      {state?.message && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          {state.message}
        </div>
      )}
      {state?.success && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Profile updated successfully.
        </div>
      )}

      {/* Personal info */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Personal Info</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name" name="firstName" defaultValue={rep.firstName} error={state?.errors?.firstName?.[0]} />
          <Field label="Last Name"  name="lastName"  defaultValue={rep.lastName}  error={state?.errors?.lastName?.[0]} />
          <Field label="Email (read-only)" name="_email" defaultValue={rep.email} readOnly />
          <Field label="Phone" name="phone" defaultValue={rep.phone} placeholder="+1 (555) 000-0000" error={state?.errors?.phone?.[0]} />
          <div className="col-span-2">
            <Field label="Website" name="website" type="url" defaultValue={rep.website} placeholder="https://yoursite.com" error={state?.errors?.website?.[0]} />
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Addresses</p>
        <div className="grid grid-cols-1 gap-4">
          <Field label="Billing Address"  name="billingAddress"  defaultValue={rep.billingAddress}  placeholder="123 Main St, City, State 12345" />
          <Field label="Shipping Address" name="shippingAddress" defaultValue={rep.shippingAddress} placeholder="Same as billing or different" />
        </div>
      </div>

      {/* Bank details */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Bank Details</p>
        <p className="text-xs text-gray-400 mb-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Required for withdrawal requests. Keep this up to date.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Bank Name"       name="bankName"          defaultValue={rep.bankName}          placeholder="e.g. Chase Bank" />
          <Field label="Account Name"    name="bankAccountName"   defaultValue={rep.bankAccountName}   placeholder="Name on account" />
          <div className="col-span-2">
            <Field label="Account Number" name="bankAccountNumber" defaultValue={rep.bankAccountNumber} placeholder="Bank account number" />
          </div>
        </div>
      </div>

      <button
        type="submit" disabled={pending}
        className="w-full py-2.5 bg-[#3DBFA4] hover:bg-[#35a993] disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        {pending ? "Saving…" : "Save Changes"}
      </button>
    </form>
  );
}

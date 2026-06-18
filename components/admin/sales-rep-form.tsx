"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { SalesRepActionState } from "@/actions/admin/manage-sales-reps";

interface SalesRepFormProps {
  action: (state: SalesRepActionState, formData: FormData) => Promise<SalesRepActionState>;
  submitLabel: string;
  backHref: string;
  successRedirect?: string;
  isEdit?: boolean;
  defaults?: {
    firstName?: string; lastName?: string; email?: string; phone?: string;
    commission?: number; billingAddress?: string; shippingAddress?: string;
    bankName?: string; bankAccountNumber?: string; bankAccountName?: string;
  };
}

const base   = "w-full border rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 transition bg-white";
const ok     = "border-gray-200 focus:border-[#3DBFA4] focus:ring-[#3DBFA4]";
const errCls = "border-red-300 focus:border-red-400 focus:ring-red-300";
const icls   = (e?: string) => `${base} ${e ? errCls : ok}`;

const sec  = "bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5";
const head = "text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100";
const lbl  = "block text-sm font-medium text-gray-700 mb-1.5";

function FE({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;
}
function Req() { return <span className="text-red-400"> *</span>; }

export function SalesRepForm({ action, submitLabel, backHref, successRedirect, isEdit, defaults }: SalesRepFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

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

  return (
    <form action={formAction} noValidate>

      {/* ── Personal Info ── */}
      <div className={sec}>
        <p className={head}>Personal Information</p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>First Name<Req /></label>
            <input name="firstName" className={icls(e.firstName?.[0])} placeholder="John" defaultValue={defaults?.firstName} />
            <FE msg={e.firstName?.[0]} />
          </div>
          <div>
            <label className={lbl}>Last Name<Req /></label>
            <input name="lastName" className={icls(e.lastName?.[0])} placeholder="Smith" defaultValue={defaults?.lastName} />
            <FE msg={e.lastName?.[0]} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={lbl}>Email<Req /></label>
            <input name="email" type="email" className={icls(e.email?.[0])} placeholder="john@example.com" defaultValue={defaults?.email} />
            <FE msg={e.email?.[0]} />
          </div>
          <div>
            <label className={lbl}>Phone</label>
            <input name="phone" className={icls()} placeholder="+1 555 000 0000" defaultValue={defaults?.phone} />
          </div>
        </div>
      </div>

      {/* ── Security (create only) ── */}
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
                  {showPass
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
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
                  {showConfirm
                    ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
              <FE msg={e.confirmPassword?.[0]} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Min 8 characters · at least one letter, one number, and one special character.</p>
        </div>
      )}

      {/* ── Financial Settings ── */}
      <div className={sec}>
        <p className={head}>Financial Settings</p>
        <div className="max-w-xs">
          <label className={lbl}>Base Commission (%)<Req /></label>
          <div className="relative">
            <input name="commission" type="number" step="0.01" min="0" max="100"
              className={icls(e.commission?.[0])} placeholder="0.00" defaultValue={defaults?.commission ?? 0} />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
          </div>
          <FE msg={e.commission?.[0]} />
        </div>
      </div>

      {/* ── Logistics ── */}
      <div className={sec}>
        <p className={head}>Logistics</p>
        <div className="mb-4">
          <label className={lbl}>Billing Address</label>
          <textarea name="billingAddress" rows={2} className={`${icls()} resize-none`}
            placeholder="123 Main St, City, State, ZIP" defaultValue={defaults?.billingAddress} />
        </div>
        <div>
          <label className={lbl}>Shipping Address</label>
          <textarea name="shippingAddress" rows={2} className={`${icls()} resize-none`}
            placeholder="123 Main St, City, State, ZIP" defaultValue={defaults?.shippingAddress} />
        </div>
      </div>

      {/* ── Payout Info ── */}
      <div className={sec}>
        <p className={head}>Payout / Bank Details</p>
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
            <input name="bankAccountName" className={icls()} placeholder="John Smith" defaultValue={defaults?.bankAccountName} />
          </div>
        </div>
      </div>

      {/* ── Actions ── */}
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

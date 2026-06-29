"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
    bankName?: string; bankAccountNumber?: string; bankAccountName?: string; swiftCode?: string; routingNumber?: string;
  };
}

const base   = "w-full border rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 transition bg-white";
const ok     = "border-gray-200 focus:border-gray-900 focus:ring-gray-900";
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
  const router   = useRouter();
  const formRef  = useRef<HTMLFormElement>(null);
  const [accNum,        setAccNum]        = useState(defaults?.bankAccountNumber ?? "");
  const [confirmAccNum, setConfirmAccNum] = useState(defaults?.bankAccountNumber ?? "");
  const [accNumError,   setAccNumError]   = useState("");

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

  function handleSubmit(ev: React.FormEvent<HTMLFormElement>) {
    if (accNum && accNum !== confirmAccNum) {
      ev.preventDefault();
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

      {/* ── Financial Settings ── */}
      <div className={sec}>
        <p className={head}>Financial Settings</p>
        <div className="max-w-xs">
          <label className={lbl}>Base Commission (%)<Req /></label>
          <div className="relative">
            <input name="commission" type="number" step="0.01" min="0" max="100"
              className={icls(e.commission?.[0])} placeholder="0.00" defaultValue={defaults?.commission ?? 0} />
            <span className="absolute right-8 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
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
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={lbl}>Bank Name</label>
            <input name="bankName" className={icls()} placeholder="e.g. Chase Bank" defaultValue={defaults?.bankName} />
          </div>
          <div>
            <label className={lbl}>Swift Code</label>
            <input name="swiftCode" className={icls()} placeholder="e.g. CHASUS33" defaultValue={defaults?.swiftCode} />
          </div>
        </div>
        <div className="mb-4">
          <label className={lbl}>Account Name</label>
          <input name="bankAccountName" className={icls()} placeholder="John Smith" defaultValue={defaults?.bankAccountName} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
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
        <div>
          <label className={lbl}>Routing Number</label>
          <input name="routingNumber" className={icls()} placeholder="e.g. 021000021"
            defaultValue={defaults?.routingNumber} />
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2">
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

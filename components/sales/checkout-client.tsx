"use client";

import { useState, useEffect, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe/client";
import { useCart } from "@/lib/cart/cart-context";
import { calculateShipping, estimatedDeliveryDate } from "@/lib/utils/shipping";
import { confirmCardOrder } from "@/actions/sales-rep/confirm-card-order";
import { payWithWallet } from "@/actions/sales-rep/wallet-pay";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  repName:              string;
  repEmail:             string;
  repPhone:             string;
  savedShippingAddress: string;
  walletBalance:        number;
};

// ── Shipping badge ─────────────────────────────────────────────────────────────

function ShippingBadge({ rate }: { rate: number }) {
  if (rate === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#3DBFA4]">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        Free
      </span>
    );
  }
  return <span className="text-sm text-gray-700">${rate.toFixed(2)}</span>;
}

// ── Stripe card form (must live inside <Elements>) ────────────────────────────

type StripeFormProps = {
  itemsJson:       string;
  shippingAddress: string;
  notes:           string;
  shippingRate:    number;
  total:           number;
  onSuccess:       (orderNumber: string) => void;
};

function StripePaymentForm({
  itemsJson,
  shippingAddress,
  notes,
  shippingRate,
  total,
  onSuccess,
}: StripeFormProps) {
  const stripe   = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [error,  setError]  = useState("");

  const handlePay = async () => {
    if (!stripe || !elements) return;
    setError("");
    setPaying(true);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      const result = await confirmCardOrder({
        paymentIntentId: paymentIntent.id,
        itemsJson,
        shippingAddress,
        notes,
        shippingRate,
        total,
      });

      if (result.success && result.orderNumber) {
        onSuccess(result.orderNumber);
      } else {
        setError(result.message ?? "Order creation failed. Contact support.");
        setPaying(false);
      }
    } else {
      setError("Unexpected payment status. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handlePay}
        disabled={!stripe || !elements || paying}
        className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#3DBFA4] text-white text-sm font-bold rounded-xl hover:bg-[#35a993] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        {paying ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Pay ${total.toFixed(2)} securely
          </>
        )}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Secured by Stripe · 256-bit encryption
      </p>
    </div>
  );
}

// ── Main checkout component ───────────────────────────────────────────────────

export function CheckoutClient({
  repName,
  repEmail,
  repPhone,
  savedShippingAddress,
  walletBalance,
}: Props) {
  const { items, clearCart } = useCart();
  const router = useRouter();

  const [paymentMethod,    setPaymentMethod]    = useState<"CARD" | "WALLET">("CARD");
  const [shippingAddress,  setShippingAddress]  = useState(savedShippingAddress);
  const [notes,            setNotes]            = useState("");
  const [clientSecret,     setClientSecret]     = useState("");
  const [fetchingIntent,   setFetchingIntent]   = useState(false);

  // Cart-derived values
  const subtotal = parseFloat(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
  const shipping = calculateShipping(subtotal);
  const total    = parseFloat((subtotal + shipping.rate).toFixed(2));
  const canWallet = walletBalance >= total;

  const itemsJson = JSON.stringify(
    items.map((i) => ({
      productId:   i.productId,
      title:       i.productTitle,
      variantSize: i.variantSize,
      sku:         i.variantSku,
      unitPrice:   i.unitPrice,
      quantity:    i.quantity,
      lineTotal:   parseFloat((i.unitPrice * i.quantity).toFixed(2)),
    }))
  );

  const estDelivery = estimatedDeliveryDate(shipping.estimatedDays);
  const estDeliveryStr = estDelivery.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  // Fetch PaymentIntent when Card tab active and items exist
  useEffect(() => {
    if (paymentMethod !== "CARD" || !items.length || total <= 0) return;
    setClientSecret("");
    setFetchingIntent(true);

    fetch("/api/checkout/create-payment-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amountInCents: Math.round(total * 100) }),
    })
      .then((r) => r.json())
      .then(({ clientSecret: cs }) => setClientSecret(cs ?? ""))
      .catch(() => toast.error("Could not initialize card payment."))
      .finally(() => setFetchingIntent(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, total]);

  // Wallet payment action state
  const [walletState, walletAction, walletPending] = useActionState(payWithWallet, undefined);

  useEffect(() => {
    if (!walletState) return;
    if (walletState.success && walletState.orderNumber) {
      toast.success("Payment successful!");
      clearCart();
      router.push(`/sales/invoice/${walletState.orderNumber}`);
    } else if (walletState.message) {
      toast.error(walletState.message);
    }
  }, [walletState, clearCart, router]);

  const handleCardSuccess = (orderNumber: string) => {
    toast.success("Payment successful!");
    clearCart();
    router.push(`/sales/invoice/${orderNumber}`);
  };

  // ── Empty cart ───────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-24">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-gray-700 mb-2">Nothing to checkout</p>
        <p className="text-sm text-gray-400 mb-6">Add products to your cart first.</p>
        <Link href="/sales/cart" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3DBFA4] text-white text-sm font-semibold rounded-xl hover:bg-[#35a993] transition-colors">
          Back to Cart
        </Link>
      </div>
    );
  }

  // ── Stripe not configured ────────────────────────────────────────────────────
  const stripeConfigured = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <Link href="/sales/cart" className="text-gray-500 hover:text-gray-700 transition-colors">Cart</Link>
        <svg className="w-3.5 h-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-800 font-medium">Checkout</span>
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-7">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

        {/* ── LEFT column ─────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-5">

          {/* 1. Contact info */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <StepHeader n={1} label="Contact Information" />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name"  value={repName  || "—"} />
              <Field label="Email" value={repEmail || "—"} mono />
              {repPhone && <Field label="Phone" value={repPhone} />}
            </div>
          </section>

          {/* 2. Shipping address */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <StepHeader n={2} label="Shipping Address" />
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Delivery address</label>
            <textarea
              rows={4}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Street address, City, State, ZIP"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3DBFA4]/40 focus:border-[#3DBFA4] resize-none transition-colors"
            />
            {savedShippingAddress && (
              <p className="text-xs text-gray-400 mt-1.5">Pre-filled from your profile — edit if needed.</p>
            )}
            <div className="mt-3 flex items-start gap-2 bg-[#3DBFA4]/5 border border-[#3DBFA4]/20 rounded-xl p-3">
              <svg className="w-4 h-4 text-[#3DBFA4] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-gray-600">
                <span className="font-semibold text-[#3DBFA4]">{shipping.label}</span>
                {shipping.rate > 0 ? ` · $${shipping.rate.toFixed(2)}` : " · Free"} — estimated delivery by{" "}
                <span className="font-medium">{estDeliveryStr}</span>.
              </p>
            </div>
          </section>

          {/* 3. Order items */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <StepHeader n={3} label={`Order Items (${items.length})`} />
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.cartId} className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
                    {item.productImage
                      ? <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.productTitle}</p>
                    <p className="text-xs text-gray-400">
                      {item.variantSize && <span>Size: {item.variantSize} · </span>}
                      Qty: {item.quantity} · ${item.unitPrice.toFixed(2)} each
                    </p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 shrink-0">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* 4. Notes */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <StepHeader n={4} label="Order Notes" />
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions…"
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3DBFA4]/40 focus:border-[#3DBFA4] resize-none transition-colors"
            />
          </section>

          {/* 5. Payment method */}
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <StepHeader n={5} label="Payment Method" />

            {/* Tabs */}
            <div className="flex gap-3 mb-5">
              <PaymentTab
                id="CARD"
                active={paymentMethod === "CARD"}
                onClick={() => setPaymentMethod("CARD")}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
                label="Credit / Debit Card"
                sub="Visa, Mastercard, Amex"
              />
              <PaymentTab
                id="WALLET"
                active={paymentMethod === "WALLET"}
                onClick={() => setPaymentMethod("WALLET")}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                }
                label="Wallet Balance"
                sub={`Available: $${walletBalance.toFixed(2)}`}
                badge={canWallet ? undefined : "low"}
              />
            </div>

            {/* Card payment */}
            {paymentMethod === "CARD" && (
              !stripeConfigured ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
                  Stripe is not configured. Add <code className="font-mono bg-amber-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> and <code className="font-mono bg-amber-100 px-1 rounded">STRIPE_SECRET_KEY</code> to your <code className="font-mono">.env</code> file.
                </div>
              ) : fetchingIntent ? (
                <div className="flex items-center justify-center py-10 gap-3 text-sm text-gray-400">
                  <span className="w-5 h-5 border-2 border-gray-200 border-t-[#3DBFA4] rounded-full animate-spin" />
                  Initializing secure payment…
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary:     "#3DBFA4",
                        borderRadius:     "12px",
                        fontFamily:       "inherit",
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    itemsJson={itemsJson}
                    shippingAddress={shippingAddress}
                    notes={notes}
                    shippingRate={shipping.rate}
                    total={total}
                    onSuccess={handleCardSuccess}
                  />
                </Elements>
              ) : (
                <div className="text-sm text-red-500 text-center py-6">
                  Could not initialize payment. Please refresh and try again.
                </div>
              )
            )}

            {/* Wallet payment */}
            {paymentMethod === "WALLET" && (
              <div className="space-y-4">
                {/* Balance display */}
                <div className={`rounded-xl border p-4 flex items-center justify-between ${canWallet ? "bg-[#3DBFA4]/5 border-[#3DBFA4]/30" : "bg-red-50 border-red-200"}`}>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Wallet Balance</p>
                    <p className={`text-2xl font-bold ${canWallet ? "text-[#3DBFA4]" : "text-red-500"}`}>
                      ${walletBalance.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-gray-500">Order Total</p>
                    <p className="text-2xl font-bold text-gray-800">${total.toFixed(2)}</p>
                  </div>
                </div>

                {canWallet ? (
                  <form action={walletAction}>
                    <input type="hidden" name="items"           value={itemsJson} />
                    <input type="hidden" name="shippingAddress" value={shippingAddress} />
                    <input type="hidden" name="shippingRate"    value={shipping.rate} />
                    <input type="hidden" name="total"           value={total} />
                    <input type="hidden" name="notes"           value={notes} />
                    <button
                      type="submit"
                      disabled={walletPending}
                      className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#3DBFA4] text-white text-sm font-bold rounded-xl hover:bg-[#35a993] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {walletPending ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Processing…
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Pay ${total.toFixed(2)} with Wallet
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-600 text-center">
                    Insufficient balance. Your wallet has <strong>${walletBalance.toFixed(2)}</strong> but this order costs <strong>${total.toFixed(2)}</strong>.
                    Please use card payment or top up your wallet.
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT column – Order Summary ──────────────────────── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <h2 className="text-sm font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">Order Summary</h2>

            {/* Line items */}
            <div className="space-y-2.5 mb-4">
              {items.map((item) => (
                <div key={item.cartId} className="flex justify-between text-xs">
                  <span className="text-gray-500 truncate pr-2 max-w-[170px]">
                    {item.productTitle}{item.variantSize ? ` (${item.variantSize})` : ""}
                    <span className="text-gray-400"> × {item.quantity}</span>
                  </span>
                  <span className="font-medium text-gray-700 shrink-0">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-2 pt-3 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <ShippingBadge rate={shipping.rate} />
              </div>
              {subtotal < 150 && (
                <p className="text-xs text-gray-400">
                  Add <strong>${(150 - subtotal).toFixed(2)}</strong> more for free shipping.
                </p>
              )}
              <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Wallet balance indicator */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Your wallet balance</span>
                <span className={`font-semibold ${canWallet ? "text-[#3DBFA4]" : "text-red-500"}`}>
                  ${walletBalance.toFixed(2)}
                </span>
              </div>
              {canWallet && paymentMethod === "WALLET" && (
                <p className="text-xs text-gray-400 mt-1">
                  Balance after payment: <strong>${(walletBalance - total).toFixed(2)}</strong>
                </p>
              )}
            </div>

            {/* Estimated delivery */}
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-start gap-2">
              <svg className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-gray-600">Estimated Delivery</p>
                <p className="text-xs text-gray-400">{estDeliveryStr}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small UI helpers ──────────────────────────────────────────────────────────

function StepHeader({ n, label }: { n: number; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-6 h-6 rounded-full bg-[#3DBFA4] flex items-center justify-center shrink-0">
        <span className="text-white text-xs font-bold">{n}</span>
      </div>
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">{label}</h2>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      <p className={`text-sm font-medium text-gray-800 bg-gray-50 rounded-xl px-3 py-2.5 ${mono ? "font-mono text-xs" : ""} truncate`}>
        {value}
      </p>
    </div>
  );
}

function PaymentTab({
  id, active, onClick, icon, label, sub, badge,
}: {
  id: string; active: boolean; onClick: () => void;
  icon: React.ReactNode; label: string; sub: string;
  badge?: "low";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
        active
          ? "border-[#3DBFA4] bg-[#3DBFA4]/5"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-[#3DBFA4] text-white" : "bg-gray-100 text-gray-500"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${active ? "text-[#3DBFA4]" : "text-gray-700"}`}>{label}</p>
        <p className={`text-xs ${badge === "low" ? "text-red-500" : "text-gray-400"}`}>{sub}</p>
      </div>
    </button>
  );
}

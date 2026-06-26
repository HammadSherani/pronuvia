"use client";

import {
  useState,
  useEffect,
  useTransition,
  forwardRef,
  useImperativeHandle,
  useRef,
} from "react";
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
import { confirmPhysicianCardOrder } from "@/actions/physician/confirm-card-order";
import { validateCoupon }            from "@/actions/checkout/validate-coupon";
import { AddressFields, EMPTY_ADDRESS, migrateAddressData, formatAddress } from "@/components/shared/address-fields";
import type { AddressData } from "@/components/shared/address-fields";

function hasAddr(a: AddressData) {
  return !!(a.firstName || a.address1 || a.city);
}

function displayAddr(a: AddressData) {
  const name   = `${a.firstName} ${a.lastName}`.trim();
  const street = [a.address1, a.address2].filter(Boolean).join(", ");
  const city   = [a.city, a.state, a.zip].filter(Boolean).join(", ");
  const line2  = [street, city, a.countryName].filter(Boolean).join(", ");
  return { name, line2 };
}

function addrToString(a: AddressData): string {
  return formatAddress(a);
}

type AppliedCoupon = { couponId: string; code: string; discountAmount: number };

type StripeHandle = { submit: () => void };

const StripeInnerForm = forwardRef<StripeHandle, {
  itemsJson:       string;
  billingAddress:  string;
  shippingAddress: string;
  notes:           string;
  total:           number;
  couponId?:       string;
  couponCode?:     string;
  discountAmount?: number;
  onSuccess:       (orderNumber: string) => void;
  onProcessing:    (v: boolean) => void;
  onError:         (msg: string) => void;
}>(function StripeInnerForm({ itemsJson, billingAddress, shippingAddress, notes, total, couponId, couponCode, discountAmount, onSuccess, onProcessing, onError }, ref) {
  const stripe   = useStripe();
  const elements = useElements();

  const handlePay = async () => {
    if (!stripe || !elements) return;
    onProcessing(true);
    onError("");
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements, redirect: "if_required",
    });
    if (stripeError) {
      onError(stripeError.message ?? "Payment failed.");
      onProcessing(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      const result = await confirmPhysicianCardOrder({
        paymentIntentId: paymentIntent.id,
        itemsJson,
        billingAddress,
        shippingAddress,
        notes,
        shippingRate: 0,
        total,
        couponId,
        couponCode,
        discountAmount,
      });
      if (result.success && result.orderNumber) {
        onSuccess(result.orderNumber);
      } else {
        onError(result.message ?? "Order creation failed. Contact support.");
        onProcessing(false);
      }
    } else {
      onError("Unexpected payment status. Please try again.");
      onProcessing(false);
    }
  };

  useImperativeHandle(ref, () => ({ submit: handlePay }));
  return <PaymentElement options={{ layout: "tabs" }} />;
});

type Props = {
  physicianEmail:  string;
  initialAddress:  Partial<AddressData> & { country?: string; state?: string };
};

export function PhysicianCheckoutClient({ physicianEmail, initialAddress }: Props) {
  const { items, clearCart } = useCart();
  const router = useRouter();

  const migrated = migrateAddressData({ ...EMPTY_ADDRESS, ...initialAddress });
  const [shipping,      setShipping]      = useState<AddressData>(migrated);
  const [billing,       setBilling]       = useState<AddressData>(migrated);
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [editShip,      setEditShip]      = useState(!hasAddr(migrated));
  const [editBill,      setEditBill]      = useState(false);

  const [notes,          setNotes]          = useState("");
  const [showNotes,      setShowNotes]      = useState(false);
  const [clientSecret,   setClientSecret]   = useState("");
  const [fetchingIntent, setFetchingIntent] = useState(false);
  const [stripeError,    setStripeError]    = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);

  const [couponInput,   setCouponInput]   = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError,   setCouponError]   = useState("");
  const [couponPending, startCoupon]      = useTransition();

  const stripeRef = useRef<StripeHandle>(null);

  const subtotal       = parseFloat(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
  const discountAmount = appliedCoupon?.discountAmount ?? 0;
  const total          = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));

  useEffect(() => {
    if (!items.length || total <= 0) return;
    setClientSecret("");
    setFetchingIntent(true);
    fetch("/api/checkout/physician-payment-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amountInCents: Math.round(total * 100) }),
    })
      .then((r) => r.json())
      .then(({ clientSecret: cs }) => setClientSecret(cs ?? ""))
      .catch(() => toast.error("Could not initialize card payment."))
      .finally(() => setFetchingIntent(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const itemsJson = JSON.stringify(items.map((i) => ({
    productId:   i.productId,
    title:       i.productTitle,
    variantSize: i.variantSize,
    sku:         i.variantSku,
    unitPrice:   i.unitPrice,
    quantity:    i.quantity,
    lineTotal:   parseFloat((i.unitPrice * i.quantity).toFixed(2)),
  })));

  const effectiveBilling = sameAsBilling ? shipping : billing;
  const shipStr = addrToString(shipping);
  const billStr = addrToString(effectiveBilling);

  const handleCardSuccess = (orderNumber: string) => {
    toast.success("Order placed successfully!");
    clearCart();
    router.push(`/physician/invoice/${orderNumber}`);
  };

  const handleApplyCoupon = () => {
    setCouponError("");
    startCoupon(async () => {
      const res = await validateCoupon(couponInput, "PHYSICIAN", subtotal);
      if (res.valid) {
        setAppliedCoupon({ couponId: res.couponId, code: res.code, discountAmount: res.discountAmount });
        setCouponInput("");
        toast.success(res.message);
      } else {
        setCouponError(res.message);
      }
    });
  };

  const handlePlaceOrder = () => {
    if (!hasAddr(shipping)) { toast.error("Please enter a shipping address."); return; }
    stripeRef.current?.submit();
  };

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-24">
        <p className="text-lg font-semibold text-gray-700 mb-2">Nothing to checkout</p>
        <p className="text-sm text-gray-400 mb-6">Add products to your cart first.</p>
        <Link href="/physician/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3DBFA4] text-white text-sm font-semibold rounded-lg hover:bg-[#35a993] transition-colors">
          Go to Shop
        </Link>
      </div>
    );
  }

  const stripeReady = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const shipDsp     = displayAddr(shipping);
  const billDsp     = displayAddr(billing);

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Checkout</h1>
      <div className="h-0.5 bg-[#3DBFA4] mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* LEFT */}
        <div className="lg:col-span-3 space-y-8">

          {/* 1. Contact */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Contact information</h2>
            <div className="border border-gray-300 rounded px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Email address</p>
              <p className="text-sm text-gray-800">{physicianEmail}</p>
            </div>
          </section>

          {/* 2. Shipping address */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Shipping address</h2>

            {editShip ? (
              <div className="border border-gray-300 rounded p-4 space-y-4">
                <AddressFields value={shipping} onChange={setShipping} />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditShip(false)}
                    className="px-5 py-2 bg-[#3DBFA4] text-white text-sm font-medium rounded hover:bg-[#35a993] transition-colors">
                    Save
                  </button>
                  {hasAddr(shipping) && (
                    <button type="button" onClick={() => setEditShip(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:border-gray-300 transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-gray-300 rounded px-4 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-800">{shipDsp.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{shipDsp.line2}</p>
                </div>
                <button type="button" onClick={() => setEditShip(true)} className="text-sm text-[#3DBFA4] hover:underline shrink-0">Edit</button>
              </div>
            )}

            {/* Same as billing checkbox */}
            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={sameAsBilling}
                onChange={(e) => {
                  setSameAsBilling(e.target.checked);
                  if (!e.target.checked && !hasAddr(billing)) {
                    setBilling({ ...shipping });
                  }
                }}
                className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4]"
              />
              <span className="text-sm text-gray-700">Use same address for billing</span>
            </label>

            {/* Billing address — shown when checkbox is unchecked */}
            {!sameAsBilling && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Billing address</p>
                {editBill ? (
                  <div className="border border-gray-300 rounded p-4 space-y-3">
                    <AddressFields value={billing} onChange={setBilling} />
                    <button type="button" onClick={() => setEditBill(false)}
                      className="px-5 py-2 bg-[#3DBFA4] text-white text-sm font-medium rounded hover:bg-[#35a993] transition-colors">
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-800">{billDsp.name}</p>
                      <p className="text-sm text-gray-500">{billDsp.line2}</p>
                    </div>
                    <button type="button" onClick={() => setEditBill(true)} className="text-sm text-[#3DBFA4] hover:underline shrink-0">Edit</button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. Payment */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Payment</h2>
            <div className="border border-gray-300 rounded p-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-gray-800 font-medium">Credit / Debit Card</span>
                <div className="ml-auto flex items-center gap-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1a1f71] text-white">VISA</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#eb001b] text-white">MC</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2e77bc] text-white">AMEX</span>
                </div>
              </div>
              {!stripeReady ? (
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700">
                  Stripe is not configured.
                </div>
              ) : fetchingIntent ? (
                <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-[#3DBFA4] rounded-full animate-spin" />
                  Initializing secure payment…
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: { theme: "stripe", variables: { colorPrimary: "#3DBFA4", borderRadius: "4px", fontFamily: "inherit" } },
                  }}
                >
                  <StripeInnerForm
                    ref={stripeRef}
                    itemsJson={itemsJson}
                    billingAddress={billStr}
                    shippingAddress={shipStr}
                    notes={notes}
                    total={total}
                    couponId={appliedCoupon?.couponId}
                    couponCode={appliedCoupon?.code}
                    discountAmount={discountAmount}
                    onSuccess={handleCardSuccess}
                    onProcessing={setCardProcessing}
                    onError={(msg) => { setStripeError(msg); if (msg) toast.error(msg); }}
                  />
                </Elements>
              ) : (
                <p className="text-sm text-red-500 py-6 text-center">Could not initialize payment. Please refresh.</p>
              )}
              {stripeError && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{stripeError}</p>
              )}
            </div>
          </section>

          {/* 4. Notes */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4]" />
              <span className="text-sm text-gray-700">Add a note to your order</span>
            </label>
            {showNotes && (
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions or notes…"
                className="mt-3 w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
            )}
          </div>

          <p className="text-xs text-gray-500">
            By proceeding you agree to our{" "}
            <Link href="/terms"   className="underline hover:text-gray-700">Terms and Conditions</Link>{" "}and{" "}
            <Link href="/privacy" className="underline hover:text-gray-700">Privacy Policy</Link>.
          </p>

          <button type="button" onClick={handlePlaceOrder}
            disabled={cardProcessing || !hasAddr(shipping)}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded transition-colors">
            {cardProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Placing order…
              </span>
            ) : "Place Order"}
          </button>
        </div>

        {/* RIGHT — Order summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
            <div className="border border-gray-200 rounded overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-800">Order summary</h2>
              </div>
              <div className="px-4 py-4 space-y-4 border-b border-gray-200">
                {items.map((item) => (
                  <div key={item.cartId} className="flex gap-3 items-start">
                    <div className="relative shrink-0">
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                        {item.productImage
                          ? <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                        }
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800 font-medium truncate">{item.productTitle}</p>
                      {item.variantSize && <p className="text-xs text-gray-400">Size: {item.variantSize}</p>}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 shrink-0">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
              {/* Coupon input */}
              <div className="px-4 py-3 border-b border-gray-200">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded px-3 py-2">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <div>
                        <span className="text-xs font-bold text-emerald-700 font-mono">{appliedCoupon.code}</span>
                        <span className="text-xs text-emerald-600 ml-1">— −${appliedCoupon.discountAmount.toFixed(2)}</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => setAppliedCoupon(null)}
                      className="text-xs text-emerald-600 hover:text-emerald-800 underline shrink-0">
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex gap-2">
                      <input
                        type="text" placeholder="Coupon code"
                        value={couponInput}
                        onChange={(e) => { setCouponInput(e.target.value.toUpperCase()); setCouponError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 font-mono placeholder:font-sans placeholder:text-gray-400"
                      />
                      <button type="button" onClick={handleApplyCoupon} disabled={couponPending || !couponInput.trim()}
                        className="px-3 py-2 text-xs font-bold text-white bg-gray-800 hover:bg-gray-900 disabled:opacity-50 rounded transition-colors whitespace-nowrap">
                        {couponPending ? "…" : "Apply"}
                      </button>
                    </div>
                    {couponError && <p className="text-xs text-red-600">{couponError}</p>}
                  </div>
                )}
              </div>

              <div className="px-4 py-4 space-y-2 border-b border-gray-200 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Coupon ({appliedCoupon.code})</span>
                    <span>−${appliedCoupon.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-400">
                  <span>Shipping</span>
                  <span className="italic text-xs">Added at fulfillment</span>
                </div>
              </div>
              <div className="px-4 py-4">
                <div className="flex justify-between text-base font-bold text-gray-900">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="border border-blue-50 bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-3">
              <svg className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700 leading-relaxed">
                Shipping charges are calculated by our team and will appear in your order tracking once shipped.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

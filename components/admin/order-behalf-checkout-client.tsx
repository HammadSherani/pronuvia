"use client";

import {
  useState, useEffect, useTransition,
  forwardRef, useImperativeHandle, useRef,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe/client";
import { useCart } from "@/lib/cart/cart-context";
import { confirmBehalfCardOrder } from "@/actions/admin/order-behalf";
import { validateCoupon } from "@/actions/checkout/validate-coupon";
import { AddressFields, EMPTY_ADDRESS, migrateAddressData, formatAddress } from "@/components/shared/address-fields";
import type { AddressData } from "@/components/shared/address-fields";

function hasAddr(a: AddressData) {
  return !!(a.firstName || a.address1 || a.city);
}

function displayAddr(a: AddressData) {
  const name  = `${a.firstName} ${a.lastName}`.trim();
  const line2 = [[a.address1, a.address2].filter(Boolean).join(", "), [a.city, a.state, a.zip].filter(Boolean).join(", "), a.countryName].filter(Boolean).join(", ");
  return { name, line2 };
}

type AppliedCoupon = { couponId: string; code: string; discountAmount: number };
type StripeHandle  = { submit: () => void };

const StripeInnerForm = forwardRef<StripeHandle, {
  physicianId:     string;
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
}>(function StripeInnerForm({ physicianId, itemsJson, billingAddress, shippingAddress, notes, total, couponId, couponCode, discountAmount, onSuccess, onProcessing, onError }, ref) {
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
      const result = await confirmBehalfCardOrder({
        physicianId,
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
        onError(result.message ?? "Order creation failed.");
        onProcessing(false);
      }
    } else {
      onError("Unexpected payment status. Please try again.");
      onProcessing(false);
    }
  };

  useImperativeHandle(ref, () => ({ submit: handlePay }));
  return (
    <PaymentElement
      options={{
        layout: "tabs",
        wallets: { applePay: "never", googlePay: "never" },
        terms:   { card: "never", usBankAccount: "never", auBecsDebit: "never", bancontact: "never", ideal: "never", sepaDebit: "never", sofort: "never" },
      }}
    />
  );
});

type Props = {
  physicianId:    string;
  physicianName:  string;
  physicianEmail: string;
  initialAddress: Partial<AddressData>;
};

export function BehalfCheckoutClient({ physicianId, physicianName, physicianEmail, initialAddress }: Props) {
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
    fetch("/api/checkout/admin-behalf-payment-intent", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amountInCents: Math.round(total * 100), physicianId }),
    })
      .then((r) => r.json())
      .then(({ clientSecret: cs }) => setClientSecret(cs ?? ""))
      .catch(() => toast.error("Could not initialize card payment."))
      .finally(() => setFetchingIntent(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, physicianId]);

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
  const shipStr = formatAddress(shipping);
  const billStr = formatAddress(effectiveBilling);
  const shipDsp = displayAddr(shipping);
  const billDsp = displayAddr(effectiveBilling);

  const handleCardSuccess = (orderNumber: string) => {
    toast.success("Order placed successfully!");
    clearCart();
    router.push(`/admin/orders`);
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
        <p className="text-sm text-gray-400 mb-6">Add products to the cart first.</p>
        <Link href={`/admin/order-behalf/${physicianId}/shop`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3DBFA4] text-white text-sm font-semibold rounded-lg hover:bg-[#35a993] transition-colors">
          Go to Shop
        </Link>
      </div>
    );
  }

  const stripeReady = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="max-w-5xl">
      {/* On-behalf banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 mb-6">
        <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <p className="text-sm text-amber-800">
          <span className="font-semibold">Ordering on behalf of</span> {physicianName}
          <span className="text-amber-600 ml-2 text-xs">({physicianEmail})</span>
        </p>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Checkout</h1>
      <div className="h-0.5 bg-[#3DBFA4] mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* LEFT */}
        <div className="lg:col-span-3 space-y-8">

          {/* Contact */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Contact information</h2>
            <div className="border border-gray-300 rounded px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Email address</p>
              <p className="text-sm text-gray-800">{physicianEmail}</p>
            </div>
          </section>

          {/* Shipping address */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Shipping address</h2>
            {editShip ? (
              <div className="border border-gray-300 rounded p-4 space-y-4">
                <AddressFields value={shipping} onChange={setShipping} />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditShip(false)}
                    className="px-5 py-2 bg-[#3DBFA4] text-white text-sm font-medium rounded hover:bg-[#35a993] transition-colors">
                    Use this address
                  </button>
                  {hasAddr(shipping) && (
                    <button type="button" onClick={() => setEditShip(false)}
                      className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
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

            <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
              <input type="checkbox" checked={sameAsBilling}
                onChange={(e) => { setSameAsBilling(e.target.checked); if (!e.target.checked && !hasAddr(billing)) setBilling({ ...shipping }); }}
                className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4]" />
              <span className="text-sm text-gray-700">Use same address for billing</span>
            </label>

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

          {/* Payment */}
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
                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700">Stripe is not configured.</div>
              ) : fetchingIntent ? (
                <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
                  <span className="w-4 h-4 border-2 border-gray-200 border-t-[#3DBFA4] rounded-full animate-spin" />
                  Initializing secure payment…
                </div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "stripe", variables: { colorPrimary: "#3DBFA4", borderRadius: "4px", fontFamily: "inherit" } } }}>
                  <StripeInnerForm
                    ref={stripeRef}
                    physicianId={physicianId}
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
              {stripeError && <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">{stripeError}</p>}
            </div>
          </section>

          {/* Coupon */}
          <div>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Coupon code</h2>
            {appliedCoupon ? (
              <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50 rounded px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">{appliedCoupon.code}</p>
                  <p className="text-xs text-emerald-600">−${appliedCoupon.discountAmount.toFixed(2)} discount applied</p>
                </div>
                <button type="button" onClick={() => setAppliedCoupon(null)} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text" value={couponInput} onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#3DBFA4] focus:border-[#3DBFA4]"
                  onKeyDown={(e) => { if (e.key === "Enter") handleApplyCoupon(); }}
                />
                <button type="button" onClick={handleApplyCoupon} disabled={couponPending || !couponInput.trim()}
                  className="px-4 py-2.5 bg-gray-800 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:opacity-50 transition-colors">
                  {couponPending ? "…" : "Apply"}
                </button>
              </div>
            )}
            {couponError && <p className="mt-1.5 text-xs text-red-500">{couponError}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={showNotes} onChange={(e) => setShowNotes(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4]" />
              <span className="text-sm text-gray-700">Add a note to this order</span>
            </label>
            {showNotes && (
              <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions or notes…"
                className="mt-3 w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none" />
            )}
          </div>

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
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100 shrink-0">
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
                      <p className="text-sm text-gray-800 leading-snug line-clamp-2">{item.productTitle}</p>
                      {item.variantSize && <p className="text-xs text-gray-500 mt-0.5">{item.variantSize}</p>}
                      <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 shrink-0">${(item.unitPrice * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>
              <div className="px-4 py-3 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount ({appliedCoupon?.code})</span><span>−${discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Shipping</span><span className="text-emerald-600 font-medium">Free</span>
                </div>
                <div className="flex justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

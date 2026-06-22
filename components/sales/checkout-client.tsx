"use client";

import {
  useState,
  useEffect,
  useCallback,
  useActionState,
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
import { calculateShipping } from "@/lib/utils/shipping";
import { confirmCardOrder } from "@/actions/sales-rep/confirm-card-order";
import { payWithWallet } from "@/actions/sales-rep/wallet-pay";
import { saveCheckoutAddress } from "@/actions/sales-rep/save-address";
import type { AddressData } from "@/actions/sales-rep/save-address";

// ── Types ───────────────────────────────────────────────────────────────────

type FedExRate = {
  serviceType:  string;
  serviceName:  string;
  rate:         number;
  currency:     string;
  deliveryInfo: string | null;
};

// ── Address helpers ─────────────────────────────────────────────────────────

const EMPTY: AddressData = {
  firstName: "", lastName: "",  address1: "", address2: "",
  city:      "", state:    "",  zip:      "", country:  "United States",
};

function parseAddr(raw: string): AddressData {
  if (!raw) return EMPTY;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.firstName === "string") return p as AddressData;
  } catch { /* plain text — ignore */ }
  return EMPTY;
}

function hasAddr(a: AddressData) {
  return !!(a.firstName || a.address1 || a.city);
}

function displayAddr(a: AddressData) {
  const name   = `${a.firstName} ${a.lastName}`.trim();
  const street = [a.address1, a.address2].filter(Boolean).join(", ");
  const city   = [a.city, a.state, a.zip].filter(Boolean).join(", ");
  const line2  = [street, city, a.country].filter(Boolean).join(", ");
  return { name, line2 };
}

function addrToString(a: AddressData): string {
  return [
    `${a.firstName} ${a.lastName}`.trim(),
    a.address1,
    a.address2,
    [a.city, a.state, a.zip].filter(Boolean).join(", "),
    a.country,
  ].filter(Boolean).join("\n");
}

// ── Shared input class ──────────────────────────────────────────────────────

const inp =
  "w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 transition-colors bg-white placeholder:text-gray-400";

// ── Address field group ─────────────────────────────────────────────────────

function AddressFields({
  value,
  onChange,
}: {
  value: AddressData;
  onChange: (v: AddressData) => void;
}) {
  const set =
    (k: keyof AddressData) => (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...value, [k]: e.target.value });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input className={inp} placeholder="First name" value={value.firstName} onChange={set("firstName")} />
        <input className={inp} placeholder="Last name"  value={value.lastName}  onChange={set("lastName")} />
      </div>
      <input className={inp} placeholder="Address" value={value.address1} onChange={set("address1")} />
      <input className={inp} placeholder="Apartment, suite, etc. (optional)" value={value.address2} onChange={set("address2")} />
      <div className="grid grid-cols-5 gap-3">
        <input className={inp + " col-span-2"} placeholder="City"     value={value.city}  onChange={set("city")} />
        <input className={inp}                  placeholder="State"    value={value.state} onChange={set("state")} />
        <input className={inp + " col-span-2"} placeholder="ZIP code" value={value.zip}   onChange={set("zip")} />
      </div>
      <input className={inp} placeholder="Country" value={value.country} onChange={set("country")} />
    </div>
  );
}

// ── Stripe inner form (must live inside <Elements>) ─────────────────────────

type StripeHandle = { submit: () => void };
type StripeFormProps = {
  itemsJson:       string;
  shippingAddress: string;
  notes:           string;
  shippingRate:    number;
  total:           number;
  onSuccess:       (orderNumber: string) => void;
  onProcessing:    (v: boolean) => void;
  onError:         (msg: string) => void;
};

const StripeInnerForm = forwardRef<StripeHandle, StripeFormProps>(
  function StripeInnerForm(
    { itemsJson, shippingAddress, notes, shippingRate, total, onSuccess, onProcessing, onError },
    ref
  ) {
    const stripe   = useStripe();
    const elements = useElements();

    const handlePay = async () => {
      if (!stripe || !elements) return;
      onProcessing(true);
      onError("");

      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
      });

      if (stripeError) {
        onError(stripeError.message ?? "Payment failed.");
        onProcessing(false);
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
  }
);

// ── Main component ──────────────────────────────────────────────────────────

type Props = {
  repEmail:             string;
  savedShippingAddress: string;
  savedBillingAddress:  string;
  walletBalance:        number;
  commission:           number;
};

export function CheckoutClient({
  repEmail,
  savedShippingAddress,
  savedBillingAddress,
  walletBalance,
  commission,
}: Props) {
  const { items, clearCart } = useCart();
  const router = useRouter();

  // address
  const [shipping,      setShipping]      = useState<AddressData>(() => parseAddr(savedShippingAddress));
  const [billing,       setBilling]       = useState<AddressData>(() => {
    const b = parseAddr(savedBillingAddress);
    return hasAddr(b) ? b : parseAddr(savedShippingAddress);
  });
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [editShip,      setEditShip]      = useState(!hasAddr(parseAddr(savedShippingAddress)));
  const [editBill,      setEditBill]      = useState(false);
  const [savingAddr,    setSavingAddr]    = useState(false);

  // shipping rates (FedEx)
  const [fedexRates,    setFedexRates]    = useState<FedExRate[]>([]);
  const [selectedRate,  setSelectedRate]  = useState<FedExRate | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [isSandbox,     setIsSandbox]     = useState(false);

  // payment
  const [payMethod,      setPayMethod]      = useState<"CARD" | "WALLET">("CARD");
  const [notes,          setNotes]          = useState("");
  const [showNotes,      setShowNotes]      = useState(false);
  const [clientSecret,   setClientSecret]   = useState("");
  const [fetchingIntent, setFetchingIntent] = useState(false);
  const [stripeError,    setStripeError]    = useState("");
  const [cardProcessing, setCardProcessing] = useState(false);

  const stripeRef    = useRef<StripeHandle>(null);
  const walletSubmit = useRef<HTMLButtonElement>(null);

  // cart math
  const subtotal       = parseFloat(items.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2));
  const staticShipping = calculateShipping(subtotal);
  const activeRate     = selectedRate?.rate ?? staticShipping.rate;
  const shippingRate   = activeRate;
  const total          = parseFloat((subtotal + activeRate).toFixed(2));
  const cashback       = commission > 0 ? parseFloat((total * commission / 100).toFixed(2)) : 0;
  const canWallet      = walletBalance >= total;

  // FedEx rate fetch
  const fetchRates = useCallback(async (addr: AddressData) => {
    if (!hasAddr(addr) || !addr.zip) return;
    setFetchingRates(true);
    try {
      const totalWeightLb = items.reduce((s, i) => s + i.quantity, 0);
      const res = await fetch("/api/shipping/rates", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ destination: addr, totalWeightLb }),
      });
      const data = await res.json();
      if (data.rates?.length > 0) {
        setFedexRates(data.rates);
        setIsSandbox(!!data.sandbox);
        // In sandbox all rates are $0 — keep selectedRate null so static fallback is used for total
        setSelectedRate(data.sandbox ? null : data.rates[0]);
      } else {
        setFedexRates([]);
        setIsSandbox(false);
        setSelectedRate(null);
      }
    } catch {
      setFedexRates([]);
      setSelectedRate(null);
    } finally {
      setFetchingRates(false);
    }
  }, [items]);

  // Fetch on mount if address already saved
  useEffect(() => {
    if (hasAddr(shipping)) fetchRates(shipping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const itemsJson       = JSON.stringify(items.map((i) => ({
    productId:   i.productId,
    title:       i.productTitle,
    variantSize: i.variantSize,
    sku:         i.variantSku,
    unitPrice:   i.unitPrice,
    quantity:    i.quantity,
    lineTotal:   parseFloat((i.unitPrice * i.quantity).toFixed(2)),
  })));
  const shipStr = addrToString(shipping);

  // save address + re-fetch rates
  const handleSaveAddress = async () => {
    setSavingAddr(true);
    const billingToSave = sameAsBilling ? shipping : billing;
    const res = await saveCheckoutAddress({ shipping, billing: billingToSave });
    setSavingAddr(false);
    if (res.success) {
      toast.success("Address saved.");
      setEditShip(false);
      fetchRates(shipping);
    } else {
      toast.error(res.message ?? "Failed to save address.");
    }
  };

  // fetch stripe payment intent
  useEffect(() => {
    if (payMethod !== "CARD" || !items.length || total <= 0) return;
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
  }, [payMethod, total]);

  // wallet action
  const [walletState, walletAction, walletPending] = useActionState(payWithWallet, undefined);
  useEffect(() => {
    if (!walletState) return;
    if (walletState.success && walletState.orderNumber) {
      toast.success("Order placed successfully!");
      clearCart();
      router.push(`/sales/invoice/${walletState.orderNumber}`);
    } else if (walletState.message) {
      toast.error(walletState.message);
    }
  }, [walletState, clearCart, router]);

  const handleCardSuccess = (orderNumber: string) => {
    toast.success("Order placed successfully!");
    clearCart();
    router.push(`/sales/invoice/${orderNumber}`);
  };

  // place order
  const handlePlaceOrder = () => {
    if (!hasAddr(shipping)) {
      toast.error("Please enter a shipping address.");
      return;
    }
    if (payMethod === "CARD") {
      stripeRef.current?.submit();
    } else {
      walletSubmit.current?.click();
    }
  };

  const isDisabled =
    cardProcessing ||
    walletPending  ||
    (payMethod === "WALLET" && !canWallet) ||
    !hasAddr(shipping);

  // empty cart
  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-24">
        <p className="text-lg font-semibold text-gray-700 mb-2">Nothing to checkout</p>
        <p className="text-sm text-gray-400 mb-6">Add products to your cart first.</p>
        <Link href="/sales/shop" className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3DBFA4] text-white text-sm font-semibold rounded-lg hover:bg-[#35a993] transition-colors">
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
      {/* Title */}
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Checkout</h1>
      <div className="h-0.5 bg-blue-500 mb-6" />

      {/* Cashback banner */}
      {cashback > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded mb-6 text-sm text-gray-700">
          <svg className="w-5 h-5 text-blue-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
          </svg>
          Upon placing this order a cashback of{" "}
          <strong className="text-gray-900">${cashback.toFixed(2)}</strong>{" "}
          will be credited to your wallet.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

        {/* ── LEFT COLUMN ───────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-8">

          {/* 1. Contact information */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Contact information</h2>
            <div className="border border-gray-300 rounded">
              <div className="px-4 py-3">
                <p className="text-xs text-gray-400 mb-0.5">Email address</p>
                <p className="text-sm text-gray-800">{repEmail}</p>
              </div>
            </div>
          </section>

          {/* 2. Shipping address */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Shipping address</h2>

            {editShip ? (
              <div className="border border-gray-300 rounded p-4 space-y-4">
                <AddressFields value={shipping} onChange={setShipping} />
                <div className="flex gap-3">
                  <button
                    onClick={handleSaveAddress}
                    disabled={savingAddr}
                    className="px-5 py-2 bg-[#3DBFA4] text-white text-sm font-medium rounded hover:bg-[#35a993] disabled:opacity-50 transition-colors"
                  >
                    {savingAddr ? "Saving…" : "Save"}
                  </button>
                  {hasAddr(shipping) && (
                    <button
                      onClick={() => setEditShip(false)}
                      className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded hover:border-gray-300 transition-colors"
                    >
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
                <button
                  onClick={() => setEditShip(true)}
                  className="text-sm text-[#3DBFA4] hover:underline shrink-0"
                >
                  Edit
                </button>
              </div>
            )}

            {/* Same as billing */}
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

            {/* Billing address */}
            {!sameAsBilling && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Billing address</p>
                {editBill ? (
                  <div className="border border-gray-300 rounded p-4 space-y-3">
                    <AddressFields value={billing} onChange={setBilling} />
                    <button
                      onClick={() => setEditBill(false)}
                      className="px-5 py-2 bg-[#3DBFA4] text-white text-sm font-medium rounded hover:bg-[#35a993] transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-300 rounded px-4 py-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-gray-800">{billDsp.name}</p>
                      <p className="text-sm text-gray-500">{billDsp.line2}</p>
                    </div>
                    <button
                      onClick={() => setEditBill(true)}
                      className="text-sm text-[#3DBFA4] hover:underline shrink-0"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 3. Payment options */}
          <section>
            <h2 className="text-base font-semibold text-gray-800 mb-3">Payment options</h2>
            <div className="border border-gray-300 rounded divide-y divide-gray-200">

              {/* Card */}
              <div>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === "CARD"}
                    onChange={() => setPayMethod("CARD")}
                    className="accent-[#3DBFA4]"
                  />
                  <span className="text-sm text-gray-800 font-medium">Credit / Debit Card</span>
                  <div className="ml-auto flex items-center gap-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1a1f71] text-white">VISA</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#eb001b] text-white">MC</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#2e77bc] text-white">AMEX</span>
                  </div>
                </label>

                {payMethod === "CARD" && (
                  <div className="px-4 pb-4">
                    {!stripeReady ? (
                      <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-700">
                        Stripe is not configured — add <code className="font-mono text-xs bg-amber-100 px-1 rounded">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>.
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
                          appearance: {
                            theme: "stripe",
                            variables: { colorPrimary: "#3DBFA4", borderRadius: "4px", fontFamily: "inherit" },
                          },
                        }}
                      >
                        <StripeInnerForm
                          ref={stripeRef}
                          itemsJson={itemsJson}
                          shippingAddress={shipStr}
                          notes={notes}
                          shippingRate={shippingRate}
                          total={total}
                          onSuccess={handleCardSuccess}
                          onProcessing={setCardProcessing}
                          onError={(msg) => { setStripeError(msg); if (msg) toast.error(msg); }}
                        />
                      </Elements>
                    ) : (
                      <p className="text-sm text-red-500 py-6 text-center">
                        Could not initialize payment. Please refresh the page.
                      </p>
                    )}
                    {stripeError && (
                      <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                        {stripeError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Wallet */}
              <div>
                <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
                  <input
                    type="radio"
                    name="payMethod"
                    checked={payMethod === "WALLET"}
                    onChange={() => setPayMethod("WALLET")}
                    className="accent-[#3DBFA4]"
                  />
                  <span className="text-sm text-gray-800 font-medium">Wallet Balance</span>
                  <span className={`ml-auto text-xs font-semibold ${canWallet ? "text-[#3DBFA4]" : "text-red-500"}`}>
                    ${walletBalance.toFixed(2)} available
                  </span>
                </label>
                {payMethod === "WALLET" && !canWallet && (
                  <p className="px-4 pb-3 text-xs text-red-600 bg-red-50 mx-4 mb-3 rounded p-2">
                    Insufficient balance. You need <strong>${total.toFixed(2)}</strong> but have <strong>${walletBalance.toFixed(2)}</strong>.
                    Please use card payment or top up your wallet.
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* 5. Notes */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showNotes}
                onChange={(e) => setShowNotes(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 accent-[#3DBFA4]"
              />
              <span className="text-sm text-gray-700">Add a note to your order</span>
            </label>
            {showNotes && (
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions or notes…"
                className="mt-3 w-full px-3 py-2.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400 resize-none"
              />
            )}
          </div>

          {/* Terms */}
          <p className="text-xs text-gray-500">
            By proceeding with your purchase you agree to our{" "}
            <Link href="/terms"   className="underline hover:text-gray-700">Terms and Conditions</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-gray-700">Privacy Policy</Link>.
          </p>

          {/* Hidden wallet form */}
          <form action={walletAction} className="hidden">
            <input type="hidden" name="items"           value={itemsJson} />
            <input type="hidden" name="shippingAddress" value={shipStr} />
            <input type="hidden" name="shippingRate"    value={shippingRate} />
            <input type="hidden" name="total"           value={total} />
            <input type="hidden" name="notes"           value={notes} />
            <button ref={walletSubmit} type="submit" aria-hidden="true" />
          </form>

          {/* Place Order */}
          <button
            onClick={handlePlaceOrder}
            disabled={isDisabled}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white text-sm font-bold rounded transition-colors"
          >
            {cardProcessing || walletPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Placing order…
              </span>
            ) : (
              "Place Order"
            )}
          </button>
        </div>

        {/* ── RIGHT COLUMN – Order Summary ──────────────────────── */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 space-y-4">
          <div className="border border-gray-200 rounded overflow-hidden">

            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">Order summary</h2>
            </div>

            {/* Items */}
            <div className="px-4 py-4 space-y-4 border-b border-gray-200">
              {items.map((item) => (
                <div key={item.cartId} className="flex gap-3 items-start">
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-50 border border-gray-100">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt={item.productTitle}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-5 h-5 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 font-medium truncate">{item.productTitle}</p>
                    {item.variantSize && (
                      <p className="text-xs text-gray-400">Size: {item.variantSize}</p>
                    )}
                    <p className="text-[11px] text-orange-600 mt-1 leading-snug">
                      This product is distributed only through participating medical practitioners and not to patients directly.
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 shrink-0">
                    ${(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="px-4 py-4 space-y-3 border-b border-gray-200 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {walletBalance > 0 && (
                <div className="flex items-center justify-between text-xs py-2 border-y border-gray-100">
                  <span>
                    You have{" "}
                    <span className="text-blue-600 font-semibold">${walletBalance.toFixed(2)}</span>{" "}
                    in your wallet to spend!
                  </span>
                  <svg className="w-4 h-4 text-gray-400 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              )}
              <div className="flex justify-between">
                <span>{selectedRate?.serviceName ?? staticShipping.label}</span>
                <span className={shippingRate === 0 ? "font-semibold text-gray-800" : ""}>
                  {shippingRate === 0 ? "FREE" : `$${shippingRate.toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Total */}
            <div className="px-4 py-4">
              <div className="flex justify-between text-base font-bold text-gray-900">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Shipping options — below order summary */}
          <div className="border border-gray-200 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-800">Shipping options</h2>
            </div>

            <div className="px-4 py-3">
              {!hasAddr(shipping) ? (
                <p className="text-xs text-gray-400 py-1">
                  Enter shipping address to see rates.
                </p>
              ) : fetchingRates ? (
                <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                  <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-[#3DBFA4] rounded-full animate-spin" />
                  Calculating FedEx rates…
                </div>
              ) : fedexRates.length > 0 ? (
                <div className="space-y-1.5">
                  {isSandbox && (
                    <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mb-2">
                      Sandbox mode — actual rates will show in production.
                    </p>
                  )}
                  {fedexRates.map((r, idx) => (
                    <label
                      key={r.serviceType}
                      className="flex items-center justify-between py-2 px-1 cursor-pointer hover:bg-gray-50 rounded transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="shippingRate"
                          checked={isSandbox ? idx === 0 : selectedRate?.serviceType === r.serviceType}
                          onChange={() => !isSandbox && setSelectedRate(r)}
                          className="accent-[#3DBFA4]"
                          readOnly={isSandbox}
                        />
                        <div>
                          <p className="text-xs text-gray-800">{r.serviceName}</p>
                          {r.deliveryInfo && (
                            <p className="text-[11px] text-gray-400">{r.deliveryInfo}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 shrink-0">
                        {isSandbox
                          ? "TBD"
                          : r.rate === 0
                          ? "FREE"
                          : `$${r.rate.toFixed(2)}`}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <label className="flex items-center justify-between py-2 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input type="radio" checked readOnly className="accent-[#3DBFA4]" />
                    <span className="text-xs text-gray-700">{staticShipping.label}</span>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">
                    {staticShipping.rate === 0 ? "FREE" : `$${staticShipping.rate.toFixed(2)}`}
                  </span>
                </label>
              )}
            </div>
          </div>
          </div>{/* end sticky wrapper */}
        </div>

      </div>
    </div>
  );
}

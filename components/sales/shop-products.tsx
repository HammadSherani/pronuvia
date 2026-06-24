"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { QuickOrderModal } from "@/components/sales/quick-order-modal";
import { useCart } from "@/lib/cart/cart-context";

type Variant  = { size?: string; salePrice?: number; stock?: number; sku?: string };
type Product  = { id: string; title: string; slug: string; image: string | null; salePrice: number; variants: unknown[]; category: { id: string; name: string } | null; status: string };
type Category = { id: string; name: string };

// ──────────────────────────────────────────────────────────
// Single product card
// ──────────────────────────────────────────────────────────
function ProductCard({ product, basePath }: { product: Product; basePath: string }) {
  const variants = product.variants as Variant[];
  const [selectedIdx, setSelectedIdx] = useState<number>(() => variants.length === 1 ? 0 : -1);
  const [qty,         setQty]         = useState(1);
  const [showModal,   setShowModal]   = useState(false);
  const { addItem } = useCart();

  const selectedVariant = selectedIdx >= 0 ? variants[selectedIdx] : null;

  const prices = variants.length > 0
    ? variants.map((v) => v.salePrice ?? product.salePrice)
    : [product.salePrice];
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const displayPrice = selectedVariant?.salePrice ?? (minPrice === maxPrice ? minPrice : null);

  function handleBuyNow() {
    if (variants.length > 0 && selectedIdx < 0) {
      toast.error("Please select a size first.");
      return;
    }
    setShowModal(true);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col overflow-hidden">

        {/* Image */}
        <Link href={`${basePath}/${product.slug}`} className="block">
          <div className="aspect-square bg-[#f8f9fa] flex items-center justify-center overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
            ) : (
              <svg className="w-14 h-14 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
        </Link>

        {/* Size selector */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-[9px] tracking-[0.15em] uppercase text-gray-400 font-medium mb-2">Size</p>
          {variants.length > 0 ? (
            <select
              value={selectedIdx}
              onChange={(e) => setSelectedIdx(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3DBFA4]/40 focus:border-[#3DBFA4] transition-colors text-gray-700"
            >
              <option value={-1}>— Size —</option>
              {variants.map((v, i) => (
                <option key={i} value={i}>
                  {v.size}{v.salePrice !== undefined ? ` — $${v.salePrice.toFixed(2)}` : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-400 italic">One size</p>
          )}
        </div>

        {/* Product info */}
        <div className="px-4 pt-3 flex-1">
          {product.category && (
            <p className="text-[9px] tracking-[0.15em] uppercase text-gray-400 font-medium mb-1">{product.category.name}</p>
          )}
          <Link href={`${basePath}/${product.slug}`}>
            <p className="text-base font-bold text-gray-900 leading-snug hover:text-[#3DBFA4] transition-colors mb-1">
              {product.title}
            </p>
          </Link>
          <p className="text-base font-bold text-[#1a6b58]">
            {displayPrice !== null
              ? `$${displayPrice.toFixed(2)}`
              : `$${minPrice.toFixed(2)}${minPrice !== maxPrice ? ` – $${maxPrice.toFixed(2)}` : ""}`}
          </p>
        </div>

        {/* QTY stepper */}
        <div className="px-4 pt-3 flex items-center gap-3">
          <span className="text-[9px] tracking-[0.15em] uppercase text-gray-400 font-medium">QTY</span>
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
            <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none select-none">
              −
            </button>
            <span className="w-10 text-center text-sm font-semibold text-gray-800">{qty}</span>
            <button type="button" onClick={() => setQty((q) => q + 1)}
              className="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors text-lg leading-none select-none">
              +
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 py-4 flex gap-2">
          <button type="button"
            onClick={() => {
              if (variants.length > 0 && selectedIdx < 0) {
                toast.error("Please select a size first.");
                return;
              }
              const sel = selectedIdx >= 0 ? variants[selectedIdx] : null;
              addItem({
                productId:    product.id,
                productTitle: product.title,
                productSlug:  product.slug,
                productImage: product.image,
                variantSize:  sel?.size ?? "",
                variantSku:   sel?.sku  ?? "",
                unitPrice:    sel?.salePrice ?? product.salePrice,
                quantity:     qty,
              });
              toast.success("Added to cart!");
            }}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#3DBFA4] text-white text-sm font-semibold rounded-xl hover:bg-[#35a993] transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Add to Cart
          </button>
        </div>
      </div>

      {showModal && (
        <QuickOrderModal
          product={{ id: product.id, title: product.title, salePrice: product.salePrice }}
          variantSize={selectedVariant?.size ?? ""}
          variantSku={selectedVariant?.sku ?? ""}
          unitPrice={selectedVariant?.salePrice ?? product.salePrice}
          qty={qty}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────
// Search + filter wrapper
// ──────────────────────────────────────────────────────────
export function ShopProducts({
  products,
  categories,
  basePath = "/sales/shop",
}: {
  products: Product[];
  categories: Category[];
  basePath?: string;
}) {
  const [search, setSearch] = useState("");
  const [catId,  setCatId]  = useState<string>("all");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat  = catId === "all" || p.category?.id === catId;
      const matchName = !q || p.title.toLowerCase().includes(q);
      return matchCat && matchName;
    });
  }, [products, search, catId]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3DBFA4]/40 focus:border-[#3DBFA4] transition-colors" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[{ id: "all", name: "All" }, ...categories].map((cat) => (
            <button key={cat.id} onClick={() => setCatId(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                catId === cat.id
                  ? "bg-[#3DBFA4] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#3DBFA4]/50"
              }`}>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-500">No products found</p>
          <p className="text-xs text-gray-400 mt-1">Try adjusting your search or category filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} basePath={basePath} />
          ))}
        </div>
      )}
    </div>
  );
}

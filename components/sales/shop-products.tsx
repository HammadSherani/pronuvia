"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { QuickOrderModal } from "@/components/sales/quick-order-modal";
import { useCart } from "@/lib/cart/cart-context";

type Variant  = { size?: string; salePrice?: number; stock?: number; sku?: string };
type Product  = { id: string; title: string; slug: string; image: string | null; salePrice: number; variants: unknown[]; category: { id: string; name: string } | null; status: string };
type Category = { id: string; name: string };

function ProductCard({ product, basePath }: { product: Product; basePath: string }) {
  const variants = product.variants as Variant[];
  const [showModal,   setShowModal]   = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const { addItem, items } = useCart();

  const inCart   = items.some((i) => i.productId === product.id);
  const isAdded  = addedToCart || inCart;

  const prices     = variants.length > 0 ? variants.map((v) => v.salePrice ?? product.salePrice) : [product.salePrice];
  const minPrice   = Math.min(...prices);
  const maxPrice   = Math.max(...prices);
  const priceLabel = minPrice === maxPrice
    ? `$${minPrice.toFixed(2)}`
    : `$${minPrice.toFixed(2)} – $${maxPrice.toFixed(2)}`;

  function handleAddToCart() {
    if (variants.length > 1) {
      setShowModal(true);
      return;
    }
    const v = variants[0] ?? null;
    addItem({
      productId:    product.id,
      productTitle: product.title,
      productSlug:  product.slug,
      productImage: product.image,
      variantSize:  v?.size  ?? "",
      variantSku:   v?.sku   ?? "",
      unitPrice:    v?.salePrice ?? product.salePrice,
      quantity:     1,
    });
    setAddedToCart(true);
    toast.success("Added to cart!");
    setTimeout(() => setAddedToCart(false), 2500);
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col overflow-hidden group">

        {/* Image area with floating button */}
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Link href={`${basePath}/${product.slug}`} className="block w-full h-full">
            {product.image ? (
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </Link>

          {/* Floating Add to Cart */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={`absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-md border transition-all duration-200 ${
              isAdded
                ? "bg-[#3DBFA4] text-white border-[#3DBFA4]"
                : "bg-white text-gray-700 border-gray-200 hover:bg-[#3DBFA4] hover:text-white hover:border-[#3DBFA4]"
            }`}
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {isAdded ? "Added to Cart" : "Add to Cart"}
          </button>

          {/* Multi-variant badge */}
          {variants.length > 1 && (
            <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-gray-500 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 shadow-sm">
              {variants.length} sizes
            </span>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col">
          {product.category && (
            <p className="text-[10px] tracking-[0.12em] uppercase text-[#3DBFA4] font-semibold mb-1">
              {product.category.name}
            </p>
          )}
          <Link href={`${basePath}/${product.slug}`} className="flex-1">
            <p className="text-sm font-semibold text-gray-900 leading-snug hover:text-[#3DBFA4] transition-colors line-clamp-2">
              {product.title}
            </p>
          </Link>
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
            <p className="text-sm font-bold text-gray-800">{priceLabel}</p>
            {variants.length > 1 && (
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className="text-[11px] text-[#3DBFA4] font-medium hover:underline"
              >
                Select size →
              </button>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <QuickOrderModal
          product={{ id: product.id, title: product.title, salePrice: product.salePrice }}
          variantSize={variants[0]?.size ?? ""}
          variantSku={variants[0]?.sku ?? ""}
          unitPrice={variants[0]?.salePrice ?? product.salePrice}
          qty={1}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

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
      {/* ── Filter bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-200 pb-4">
        {/* Category tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {[{ id: "all", name: "All Products" }, ...categories].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCatId(cat.id)}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-colors shrink-0 ${
                catId === cat.id
                  ? "text-gray-900 bg-gray-100 font-semibold"
                  : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative shrink-0">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#3DBFA4]/30 focus:border-[#3DBFA4] transition-colors w-52"
          />
        </div>
      </div>

      {/* Results count */}
      {(search || catId !== "all") && (
        <p className="text-xs text-gray-400 mb-4">
          {filtered.length} product{filtered.length !== 1 ? "s" : ""}
          {catId !== "all" && ` in ${categories.find((c) => c.id === catId)?.name ?? ""}`}
          {search && ` matching "${search}"`}
        </p>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-gray-500">No products found</p>
          <p className="text-xs text-gray-400 mt-1">Try a different search or category</p>
          {(search || catId !== "all") && (
            <button
              onClick={() => { setSearch(""); setCatId("all"); }}
              className="mt-4 text-xs text-[#3DBFA4] hover:underline font-medium"
            >
              Clear filters
            </button>
          )}
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

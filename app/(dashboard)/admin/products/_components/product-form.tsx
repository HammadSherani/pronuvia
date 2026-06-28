"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FormActions } from "@/components/admin/form-field";
import { ImageUpload } from "@/components/admin/image-upload";

type Category    = { id: string; name: string };
type SubCategory = { id: string; name: string; categoryId: string };
type SizeRow = {
  size: string; sku: string; gtin: string; image: string;
  costPrice: string; salePrice: string; stock: string; weight: string;
};

type ActionState = { errors?: Record<string, string[]>; message?: string; success?: boolean } | undefined;

interface ProductFormProps {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  backHref: string;
  successRedirect?: string;
  categories: Category[];
  subCategories: SubCategory[];
  defaults?: {
    title?: string; description?: string; image?: string; tags?: string[];
    imageGallery?: string[]; status?: string;
    categoryId?: string | null; subCategoryId?: string | null;
    variants?: {
      size: string; sku?: string; gtin?: string; image?: string;
      costPrice?: number; salePrice?: number; stock?: number; weight?: number;
    }[];
  };
}

const base   = "w-full border rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 transition bg-white";
const ok     = "border-gray-200 focus:border-gray-900 focus:ring-gray-900";
const errCls = "border-red-300 focus:border-red-400 focus:ring-red-300";
const icls   = (hasErr?: string) => `${base} ${hasErr ? errCls : ok}`;

const labelCls    = "block text-sm font-medium text-gray-700 mb-1.5";
const sectionCls  = "bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-5";
const sectionHead = "text-sm font-semibold text-gray-700 mb-4 pb-3 border-b border-gray-100";

function FE({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-red-500 mt-1">{msg}</p> : null;
}
function Req() { return <span className="text-red-400"> *</span>; }

const blankSize = (): SizeRow => ({ size: "", sku: "", gtin: "", image: "", costPrice: "", salePrice: "", stock: "", weight: "" });

export function ProductForm({ action, submitLabel, backHref, successRedirect, categories, subCategories, defaults }: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();

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

  const [mainImage, setMainImage]      = useState(defaults?.image ?? "");
  const [gallery, setGallery]          = useState<string[]>(defaults?.imageGallery ?? []);
  const [selectedCategoryId, setCatId] = useState(defaults?.categoryId ?? "");
  const [sizes, setSizes] = useState<SizeRow[]>(
    defaults?.variants?.length
      ? defaults.variants.map((v) => ({
          size:      v.size,
          sku:       v.sku       ?? "",
          gtin:      v.gtin      ?? "",
          image:     v.image     ?? "",
          costPrice: v.costPrice != null ? String(v.costPrice) : "",
          salePrice: v.salePrice != null ? String(v.salePrice) : "",
          stock:     v.stock     != null ? String(v.stock)     : "",
          weight:    v.weight    != null ? String(v.weight)    : "",
        }))
      : [blankSize()]
  );

  const filteredSubs = subCategories.filter((s) => s.categoryId === selectedCategoryId);
  const e = state?.errors ?? {};

  return (
    <form action={formAction} noValidate>

      {/* ── Basic Info ── */}
      <div className={sectionCls}>
        <p className={sectionHead}>Product Information</p>

        <div className="mb-4">
          <label className={labelCls}>Title<Req /></label>
          <input name="title" className={icls(e.title?.[0])} placeholder="Product title" defaultValue={defaults?.title} />
          <FE msg={e.title?.[0]} />
        </div>

        <div className="mb-4">
          <label className={labelCls}>Description</label>
          <textarea name="description" rows={4} className={`${icls()} resize-none`} placeholder="Product description…" defaultValue={defaults?.description} />
        </div>

        <div className="mb-4">
          <label className={labelCls}>Tags <span className="text-gray-400 font-normal">(comma separated)</span></label>
          <input name="tags" className={icls()} placeholder="supplement, vitamin, health" defaultValue={defaults?.tags?.join(", ")} />
        </div>

        <div>
          <label className={labelCls}>Status</label>
          <select name="status" defaultValue={defaults?.status ?? "ACTIVE"} className={icls()}>
            <option value="ACTIVE">Active</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* ── Media ── */}
      <div className={sectionCls}>
        <p className={sectionHead}>Media</p>

        <div className="mb-5">
          <label className={labelCls}>Main Image</label>
          <ImageUpload name="image" value={mainImage} onChange={setMainImage} />
        </div>

        <div>
          <label className={labelCls}>Gallery Images</label>
          <div className="grid grid-cols-4 gap-3">
            {gallery.map((url, i) => (
              <div key={i} className="relative">
                <ImageUpload
                  name="imageGallery[]"
                  value={url}
                  onChange={(newUrl) => setGallery((prev) => prev.map((u, idx) => (idx === i ? newUrl : u)))}
                />
                <button type="button" onClick={() => setGallery((prev) => prev.filter((_, idx) => idx !== i))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow hover:bg-red-600 cursor-pointer">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setGallery((prev) => [...prev, ""])}
              className="h-36 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-900 hover:bg-gray-900/5 transition-colors flex flex-col items-center justify-center gap-1 cursor-pointer">
              <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10px] text-gray-400">Add image</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Organisation ── */}
      <div className={sectionCls}>
        <p className={sectionHead}>Organisation</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category<Req /></label>
            <select name="categoryId" value={selectedCategoryId} onChange={(ev) => setCatId(ev.target.value)} className={icls(e.categoryId?.[0])}>
              <option value="">Select category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FE msg={e.categoryId?.[0]} />
          </div>
          <div>
            <label className={labelCls}>Sub-Category</label>
            <select name="subCategoryId" defaultValue={defaults?.subCategoryId ?? ""} className={icls()} disabled={!selectedCategoryId}>
              <option value="">{selectedCategoryId ? "Select sub-category…" : "Select a category first"}</option>
              {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Variants / Sizes ── */}
      <div className={sectionCls}>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-700">Sizes / Variants<Req /></p>
            <p className="text-xs text-gray-400 mt-0.5">At least one size is required. Each size has its own price, stock and SKU.</p>
          </div>
        </div>

        {e.variants && (
          <div className="mb-4 px-3.5 py-2.5 bg-red-50 border border-red-100 rounded-lg text-xs text-red-600">
            {e.variants[0]}
          </div>
        )}

        <div className="space-y-4">
          {sizes.map((row, i) => {
            const upd = (field: keyof SizeRow) => (ev: React.ChangeEvent<HTMLInputElement>) =>
              setSizes((prev) => prev.map((x, idx) => idx === i ? { ...x, [field]: ev.target.value } : x));
            const canRemove = sizes.length > 1;

            return (
              <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40">

                {/* Row 1: image + size name + remove */}
                <div className="flex items-start gap-4 mb-4">
                  <div className="shrink-0">
                    <p className="text-xs font-medium text-gray-500 mb-1.5">Image</p>
                    <ImageUpload name="sizeImage[]" value={row.image} compact
                      onChange={(url) => setSizes((prev) => prev.map((x, idx) => idx === i ? { ...x, image: url } : x))} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Size Name<span className="text-red-400"> *</span></label>
                    <input name="sizeName[]" className={icls()} placeholder="e.g. Small / 30ml / 100 capsules"
                      value={row.size} onChange={upd("size")} />
                  </div>

                  <button type="button" disabled={!canRemove}
                    onClick={() => setSizes((prev) => prev.filter((_, idx) => idx !== i))}
                    className={`mt-6 shrink-0 transition-colors ${canRemove ? "text-gray-400 hover:text-red-500 cursor-pointer" : "text-gray-200 cursor-not-allowed"}`}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Row 2: SKU + GTIN */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">SKU</label>
                    <input name="sizeSku[]" className={icls()} placeholder="e.g. PRN-SM-001"
                      value={row.sku} onChange={upd("sku")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">GTIN / UPC / EAN / ISBN</label>
                    <input name="sizeGtin[]" className={icls()} placeholder="Barcode"
                      value={row.gtin} onChange={upd("gtin")} />
                  </div>
                </div>

                {/* Row 3: cost price + sale price + stock + weight */}
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Cost Price ($)</label>
                    <input name="sizeCostPrice[]" type="number" step="0.01" min="0" className={icls()} placeholder="0.00"
                      value={row.costPrice} onChange={upd("costPrice")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Sale Price ($)</label>
                    <input name="sizeSalePrice[]" type="number" step="0.01" min="0" className={icls()} placeholder="0.00"
                      value={row.salePrice} onChange={upd("salePrice")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Stock</label>
                    <input name="sizeStock[]" type="number" min="0" className={icls()} placeholder="0"
                      value={row.stock} onChange={upd("stock")} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Weight (kg)</label>
                    <input name="sizeWeight[]" type="number" step="0.01" min="0" className={icls()} placeholder="0.00"
                      value={row.weight} onChange={upd("weight")} />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        <button type="button" onClick={() => setSizes((prev) => [...prev, blankSize()])}
          className="mt-4 inline-flex items-center gap-1.5 text-xs text-[#3DBFA4] hover:underline font-medium cursor-pointer">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add another size
        </button>
      </div>

      <FormActions backHref={backHref} submitLabel={submitLabel} pending={pending} />
    </form>
  );
}

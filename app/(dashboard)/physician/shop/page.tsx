import { requirePhysician } from "@/lib/auth/dal";
import { prisma } from "@/lib/db/prisma";
import { ProductStatus } from "@/generated/prisma/enums";
import { ShopProducts } from "@/components/sales/shop-products";

export const metadata = { title: "Shop – Pronuvia" };

export default async function PhysicianShopPage() {
  await requirePhysician();

  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where:   { status: ProductStatus.ACTIVE },
      select: {
        id: true, title: true, slug: true, image: true,
        salePrice: true, variants: true,
        category: { select: { id: true, name: true } },
        status: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({
      where:   { isActive: true },
      select:  { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-xl font-bold text-gray-800">Shop</h1>
        <p className="text-sm text-gray-500 mt-0.5">Browse products and place your orders.</p>
      </div>
      <ShopProducts products={products} categories={categories} basePath="/physician/shop" />
    </div>
  );
}

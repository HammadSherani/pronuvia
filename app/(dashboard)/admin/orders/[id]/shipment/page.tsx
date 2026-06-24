import { notFound }            from "next/navigation";
import { requireAdmin }         from "@/lib/auth/dal";
import { getOrderById }         from "@/actions/admin/manage-orders";
import { getOrderShipments }    from "@/actions/admin/shipping";
import { ShippingPageClient }   from "@/components/admin/shipping-page-client";
import type { OrderItem }       from "@/actions/admin/manage-orders";

type Props = { params: Promise<{ id: string }> };

export default async function OrderShipmentPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const [order, shipments] = await Promise.all([
    getOrderById(id),
    getOrderShipments(id),
  ]);

  if (!order) notFound();

  const items = order.items as unknown as OrderItem[];

  return (
    <ShippingPageClient
      orderId={order.id}
      orderNumber={order.orderNumber}
      shipments={shipments}
      physician={
        order.physician
          ? {
              firstName: order.physician.firstName,
              lastName:  order.physician.lastName,
              city:      order.physician.city  ?? null,
              state:     order.physician.state ?? null,
            }
          : null
      }
      itemCount={items.length}
      orderValue={order.total}
    />
  );
}

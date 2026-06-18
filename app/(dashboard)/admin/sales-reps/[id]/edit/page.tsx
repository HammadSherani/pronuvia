import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getSalesRepById, updateSalesRep } from "@/actions/admin/manage-sales-reps";
import { SalesRepForm } from "@/components/admin/sales-rep-form";

export const metadata = { title: "Edit Sales Rep – Pronuvia Admin" };

type Props = { params: Promise<{ id: string }> };

export default async function EditSalesRepPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;

  const rep = await getSalesRepById(id);
  if (!rep) notFound();

  const boundUpdate = updateSalesRep.bind(null, id);

  return (
    <div className="max-w-3xl">
      <Link href="/admin/sales-reps"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-5 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to Sales Representatives
      </Link>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Edit Sales Representative</h1>

      <SalesRepForm
        action={boundUpdate}
        submitLabel="Save Changes"
        backHref="/admin/sales-reps"
        successRedirect="/admin/sales-reps"
        isEdit
        defaults={{
          firstName:         rep.firstName,
          lastName:          rep.lastName,
          email:             rep.email,
          phone:             rep.phone        ?? undefined,
          commission:        rep.commission,
          billingAddress:    rep.billingAddress  ?? undefined,
          shippingAddress:   rep.shippingAddress ?? undefined,
          bankName:          rep.bankName        ?? undefined,
          bankAccountNumber: rep.bankAccountNumber ?? undefined,
          bankAccountName:   rep.bankAccountName  ?? undefined,
        }}
      />
    </div>
  );
}

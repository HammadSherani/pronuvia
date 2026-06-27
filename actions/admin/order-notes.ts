"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export type NoteType = "private" | "customer";

export type OrderNoteRow = {
  id:        string;
  type:      string;
  content:   string;
  createdAt: Date;
};

export async function getOrderNotes(orderId: string): Promise<OrderNoteRow[]> {
  await requireAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notes = await (prisma as any).orderNote.findMany({
    where:   { orderId },
    orderBy: { createdAt: "asc" },
    select:  { id: true, type: true, content: true, createdAt: true },
  });
  return notes as OrderNoteRow[];
}

export async function addOrderNote(
  orderId: string,
  type:    NoteType,
  content: string,
): Promise<{ success: boolean; message?: string }> {
  await requireAdmin();

  const trimmed = content.trim();
  if (!trimmed) return { success: false, message: "Note cannot be empty." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).orderNote.create({
    data: { orderId, type, content: trimmed },
  });

  if (type === "customer") {
    const order = await prisma.order.findUnique({
      where:  { id: orderId },
      select: {
        orderNumber: true, total: true, status: true,
        physician: { select: { email: true, firstName: true } },
      },
    });

    if (order?.physician?.email) {
      const { sendMail }       = await import("@/lib/email/mailer");
      const { orderNoteEmail } = await import("@/lib/email/templates");
      const { subject, html }  = orderNoteEmail({
        firstName:   order.physician.firstName,
        orderNumber: order.orderNumber,
        note:        trimmed,
      });
      try {
        await sendMail({ to: order.physician.email, subject, html });
      } catch (err) {
        console.error("[addOrderNote] email failed:", err);
      }
    }
  }

  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export async function deleteOrderNote(
  noteId:  string,
  orderId: string,
): Promise<{ success: boolean }> {
  await requireAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).orderNote.delete({ where: { id: noteId } });
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

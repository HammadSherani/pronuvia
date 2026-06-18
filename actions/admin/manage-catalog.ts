"use server";

import { revalidatePath } from "next/cache";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/dal";

export type CatalogActionState = {
  message?: string;
  success?: boolean;
} | undefined;

export async function saveDocument(opts: {
  fileName: string;
  fileUrl: string;
  fileSize: number;
}): Promise<CatalogActionState> {
  const session = await requireAdmin();

  await prisma.catalogDocument.create({
    data: {
      fileName:   opts.fileName,
      fileUrl:    opts.fileUrl,
      fileSize:   opts.fileSize,
      uploadedBy: session.userId,
    },
  });

  revalidatePath("/admin/downloads");
  return { success: true, message: `"${opts.fileName}" uploaded successfully.` };
}

export async function deleteDocument(id: string): Promise<CatalogActionState> {
  await requireAdmin();

  const doc = await prisma.catalogDocument.findUnique({ where: { id } });
  if (!doc) return { message: "Document not found." };

  // Remove file from disk
  try {
    const filePath = path.join(process.cwd(), "public", doc.fileUrl);
    await unlink(filePath);
  } catch {
    // File may already be missing — still remove DB record
  }

  await prisma.catalogDocument.delete({ where: { id } });

  revalidatePath("/admin/downloads");
  revalidatePath("/sales/downloads");
  revalidatePath("/physician/downloads");
  return { success: true, message: `"${doc.fileName}" deleted.` };
}

export async function listDocuments() {
  return prisma.catalogDocument.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, fileName: true, fileUrl: true, fileSize: true, createdAt: true },
  });
}

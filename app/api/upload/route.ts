import { type NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth/session";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED   = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Only JPEG, PNG and WebP are allowed" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File exceeds 5 MB limit" }, { status: 400 });

  const ext      = file.name.split(".").pop() ?? "jpg";
  const filename = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}

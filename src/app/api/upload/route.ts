import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest } from "next/server";

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf",
];

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return new Response("No file", { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type))
    return new Response("Tipo de archivo no permitido", { status: 400 });

  if (file.size > 20 * 1024 * 1024)
    return new Response("Máximo 20 MB", { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `notes/${session.user.id}/${Date.now()}.${ext}`;

  const blob = await put(filename, file, { access: "public" });

  return Response.json({
    url: blob.url,
    name: file.name,
    type: file.type,
    size: file.size,
  });
}

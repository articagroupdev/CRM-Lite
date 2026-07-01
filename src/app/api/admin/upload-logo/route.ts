import { put } from "@vercel/blob";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// One-time endpoint to upload the Artica logo to Vercel Blob and get a permanent CDN URL.
// Access: GET /api/admin/upload-logo  (admin only)
// After running, add the returned URL to ANALYZER_META_LOGO_URL in your env vars.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const logoPath = path.join(process.cwd(), "public", "img", "logo-artica-1.png");

  if (!fs.existsSync(logoPath)) {
    return NextResponse.json({ error: "Logo no encontrado en public/img/logo-artica-1.png" }, { status: 404 });
  }

  const file = fs.readFileSync(logoPath);

  const blob = await put("brand/logo-artica.png", file, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
  });

  return NextResponse.json({
    url: blob.url,
    message: "Logo subido a Vercel Blob. Agrega esta URL a ANALYZER_META_LOGO_URL en tus variables de entorno.",
  });
}

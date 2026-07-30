import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { saveBuffer, fileUrl } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const barcode = code;

  const existing = await prisma.item.findFirst({
    where: { userId, barcode },
    include: { locations: true },
  });
  if (existing) {
    return NextResponse.json({ existingItem: existing });
  }

  try {
    const offRes = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      headers: { "User-Agent": "HouseholdInventoryApp/1.0 (self-hosted personal use)" },
    });
    if (!offRes.ok) return NextResponse.json({ suggestion: null });

    const data = await offRes.json();
    if (data.status !== 1 || !data.product) {
      return NextResponse.json({ suggestion: null });
    }

    const name: string | undefined = data.product.product_name || data.product.product_name_en;
    const imageSourceUrl: string | undefined = data.product.image_front_url || data.product.image_url;

    let imageUrl: string | null = null;
    if (imageSourceUrl) {
      try {
        const imgRes = await fetch(imageSourceUrl);
        const contentType = imgRes.headers.get("content-type") ?? "image/jpeg";
        if (imgRes.ok && contentType.startsWith("image/")) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const filename = await saveBuffer(buffer, contentType.split(";")[0], userId);
          imageUrl = fileUrl(filename);
        }
      } catch {
        // Image fetch/save failure shouldn't block returning the name suggestion.
      }
    }

    return NextResponse.json({
      suggestion: name ? { name, imageUrl } : null,
    });
  } catch {
    return NextResponse.json({ suggestion: null });
  }
}

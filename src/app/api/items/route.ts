import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { saveUpload, fileUrl, userOwnsUpload } from "@/lib/storage";
import { isExpiringSoon } from "@/lib/inventory";
import { z } from "zod";

const locationSchema = z.object({
  locationName: z.string().min(1),
  quantity: z.coerce.number().min(0),
});

const itemInputSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  unitOfMeasure: z.string().min(1),
  lowStockThreshold: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  brand: z.string().optional(),
  preferredStore: z.string().optional(),
  expirationDate: z.string().optional(),
  barcode: z.string().optional(),
  locations: z.string().transform((s) => locationSchema.array().parse(JSON.parse(s))),
  tags: z
    .string()
    .optional()
    .transform((s) => (s ? (JSON.parse(s) as string[]) : [])),
});

export async function GET(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const category = searchParams.get("category")?.trim();
  const location = searchParams.get("location")?.trim();
  const lowStockOnly = searchParams.get("lowStockOnly") === "true";
  const expiringOnly = searchParams.get("expiringOnly") === "true";
  const tag = searchParams.get("tag")?.trim();

  const items = await prisma.item.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { category: { contains: q, mode: "insensitive" } },
              { brand: { contains: q, mode: "insensitive" } },
              { locations: { some: { locationName: { contains: q, mode: "insensitive" } } } },
            ],
          }
        : {}),
      ...(location ? { locations: { some: { locationName: { contains: location, mode: "insensitive" } } } } : {}),
      ...(tag ? { tags: { some: { tag: { name: tag } } } } : {}),
    },
    include: { locations: true, tags: { include: { tag: true } } },
    orderBy: { name: "asc" },
  });

  let result = items;
  if (lowStockOnly) {
    result = result.filter((item) => {
      const total = item.locations.reduce((s, l) => s + l.quantity, 0);
      return total <= item.lowStockThreshold;
    });
  }
  if (expiringOnly) {
    // Same day-granularity UTC comparison the UI uses, so the API and the
    // pages can't disagree about what's expiring.
    result = result.filter((item) => isExpiringSoon(item.expirationDate));
  }

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const raw = Object.fromEntries(formData.entries());
  const parsed = itemInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;

  let imageUrl: string | null = null;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const filename = await saveUpload(photo, userId);
    imageUrl = fileUrl(filename);
  } else {
    const existingImageUrl = formData.get("imageUrl");
    // Only trust paths pointing at our own authenticated file route, and only
    // for a file this user actually uploaded — never an arbitrary URL, and
    // never someone else's file.
    if (typeof existingImageUrl === "string" && existingImageUrl.startsWith("/api/files/")) {
      const filename = existingImageUrl.slice("/api/files/".length);
      if (await userOwnsUpload(filename, userId)) {
        imageUrl = existingImageUrl;
      }
    }
  }

  const item = await prisma.item.create({
    data: {
      userId,
      name: data.name,
      category: data.category,
      unitOfMeasure: data.unitOfMeasure,
      lowStockThreshold: data.lowStockThreshold,
      notes: data.notes || null,
      brand: data.brand || null,
      preferredStore: data.preferredStore || null,
      expirationDate: data.expirationDate ? new Date(data.expirationDate) : null,
      barcode: data.barcode || null,
      imageUrl,
      locations: { create: data.locations },
      tags: {
        create: await Promise.all(
          data.tags.map(async (name) => ({
            tag: {
              connectOrCreate: {
                where: { name },
                create: { name },
              },
            },
          }))
        ),
      },
    },
    include: { locations: true, tags: { include: { tag: true } } },
  });

  return NextResponse.json(item, { status: 201 });
}

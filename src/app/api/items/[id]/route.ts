import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { saveUpload, fileUrl } from "@/lib/storage";
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

async function loadOwnedItem(userId: string, id: string) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: { locations: true, tags: { include: { tag: true } } },
  });
  if (!item || item.userId !== userId) return null;
  return item;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await loadOwnedItem(userId, id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await loadOwnedItem(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const raw = Object.fromEntries(formData.entries());
  const parsed = itemInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const data = parsed.data;

  let imageUrl = existing.imageUrl;
  const photo = formData.get("photo");
  if (photo instanceof File && photo.size > 0) {
    const filename = await saveUpload(photo, userId);
    imageUrl = fileUrl(filename);
  }

  await prisma.itemLocation.deleteMany({ where: { itemId: existing.id } });
  await prisma.itemTag.deleteMany({ where: { itemId: existing.id } });

  const item = await prisma.item.update({
    where: { id: existing.id },
    data: {
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

  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await loadOwnedItem(userId, id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.item.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}

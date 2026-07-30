import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { restockItem } from "@/lib/restock";

const restockSchema = z.object({
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().min(0).optional(),
  storeName: z.string().optional(),
  locationName: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const item = await prisma.item.findUnique({ where: { id } });
  if (!item || item.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = restockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await restockItem(item.id, parsed.data);

  const updated = await prisma.item.findUnique({
    where: { id: item.id },
    include: { locations: true },
  });

  return NextResponse.json(updated);
}

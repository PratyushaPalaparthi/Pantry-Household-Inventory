import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

const createSchema = z.object({
  text: z.string().min(1),
  unitOfMeasure: z.string().optional(),
  storeHint: z.string().optional(),
});

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await prisma.shoppingListEntry.findMany({
    where: { userId, isManual: true, isDone: false },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const entry = await prisma.shoppingListEntry.create({
    data: {
      userId,
      text: parsed.data.text,
      unitOfMeasure: parsed.data.unitOfMeasure || null,
      storeHint: parsed.data.storeHint || null,
      isManual: true,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}

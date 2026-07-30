import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

const patchSchema = z.object({
  isDone: z.boolean().optional(),
  // Empty string clears the store, so the entry falls back to "Any store".
  storeHint: z.string().nullish(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.shoppingListEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const { isDone, storeHint } = parsed.data;
  const entry = await prisma.shoppingListEntry.update({
    where: { id },
    data: {
      ...(isDone === undefined ? {} : { isDone }),
      ...(storeHint === undefined ? {} : { storeHint: storeHint?.trim() || null }),
    },
  });

  return NextResponse.json(entry);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await prisma.shoppingListEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.shoppingListEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

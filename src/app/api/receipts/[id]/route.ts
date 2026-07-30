import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: { lines: true },
  });
  if (!receipt || receipt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(receipt);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const receipt = await prisma.receipt.findUnique({ where: { id } });
  if (!receipt || receipt.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.receipt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

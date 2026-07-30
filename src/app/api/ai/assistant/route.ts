import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { parseUpdateIntent } from "@/lib/ai/nl-update";
import { parseSearchIntent } from "@/lib/ai/nl-search";
import { findBestMatch } from "@/lib/fuzzy-match";
import { restockItem } from "@/lib/restock";
import { consumeItem } from "@/lib/consume";

const bodySchema = z.object({ text: z.string().min(1) });

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const { text } = parsed.data;

  let updateIntent;
  try {
    updateIntent = await parseUpdateIntent(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI provider request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (updateIntent.action !== "unknown") {
    const items = await prisma.item.findMany({ where: { userId } });
    const match = findBestMatch(updateIntent.itemQuery, items, (i) => i.name, 0.4);

    if (!match) {
      return NextResponse.json({
        type: "update_failed",
        message: `Couldn't find an item matching "${updateIntent.itemQuery}". Try adding it first, or rephrase.`,
      });
    }

    if (updateIntent.action === "consume") {
      const { consumed, remaining } = await consumeItem(match.item.id, updateIntent.useAll ? "all" : updateIntent.quantityDelta ?? 1);
      return NextResponse.json({
        type: "update_applied",
        message: `Used ${consumed} ${match.item.unitOfMeasure} of ${match.item.name} — ${remaining} left.`,
        itemId: match.item.id,
      });
    }

    const quantity = updateIntent.quantityDelta ?? 1;
    await restockItem(match.item.id, { quantity });
    return NextResponse.json({
      type: "update_applied",
      message: `Added ${quantity} ${match.item.unitOfMeasure} of ${match.item.name}.`,
      itemId: match.item.id,
    });
  }

  let searchIntent;
  try {
    searchIntent = await parseSearchIntent(text);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI provider request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const params = new URLSearchParams();
  if (searchIntent.intent === "expiring") params.set("expiringOnly", "true");
  if (searchIntent.intent === "low_stock") params.set("lowStockOnly", "true");
  if (searchIntent.location) params.set("location", searchIntent.location);
  if (searchIntent.category) params.set("category", searchIntent.category);
  if (searchIntent.searchText) params.set("q", searchIntent.searchText);

  return NextResponse.json({ type: "search", url: `/inventory?${params.toString()}` });
}

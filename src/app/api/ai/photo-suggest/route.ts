import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";
import { suggestItemFromPhoto, PhotoSuggestionUnavailableError } from "@/lib/ai/photo-item";

export async function POST(req: Request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const photo = formData.get("photo");
  if (!(photo instanceof File) || photo.size === 0) {
    return NextResponse.json({ error: "A photo is required" }, { status: 400 });
  }

  const buffer = Buffer.from(await photo.arrayBuffer());
  const dataUrl = `data:${photo.type};base64,${buffer.toString("base64")}`;

  try {
    const suggestion = await suggestItemFromPhoto(dataUrl);
    return NextResponse.json(suggestion);
  } catch (err) {
    // A model that can't produce a usable suggestion isn't a server fault — the
    // user can still type the item in, so say that rather than returning a 502.
    if (err instanceof PhotoSuggestionUnavailableError) {
      return NextResponse.json({ error: err.message }, { status: 422 });
    }
    const message = err instanceof Error ? err.message : "AI provider request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

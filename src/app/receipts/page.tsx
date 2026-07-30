import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/session";
import { ReceiptUploadButton } from "@/components/ReceiptUploadButton";
import { Receipt as ReceiptIcon } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  processing: "Processing…",
  needs_review: "Needs review",
  confirmed: "Confirmed",
  failed: "Failed to parse",
};

const STATUS_CLASS: Record<string, string> = {
  processing: "badge-warning",
  needs_review: "badge-warning",
  confirmed: "badge-brand",
  failed: "badge-danger",
};

export default async function ReceiptsPage() {
  const userId = await getUserId();
  if (!userId) return null;

  const receipts = await prisma.receipt.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    include: { lines: true },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Receipts</h1>
        <ReceiptUploadButton />
      </div>

      {receipts.length === 0 ? (
        <p className="mt-10 text-center text-muted">No receipts scanned yet.</p>
      ) : (
        <div className="space-y-2">
          {receipts.map((r) => (
            <Link key={r.id} href={`/receipts/${r.id}`} className="card flex items-center gap-3 p-4">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ background: "var(--brand-soft)" }}
              >
                <ReceiptIcon size={18} style={{ color: "var(--brand)" }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{r.storeName ?? "Unknown store"}</p>
                <p className="text-xs text-muted">
                  {r.uploadedAt.toLocaleDateString()} · {r.lines.length} line{r.lines.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className={STATUS_CLASS[r.parsedStatus] ?? "badge"}>{STATUS_LABEL[r.parsedStatus] ?? r.parsedStatus}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

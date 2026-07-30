"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/inventory");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex gap-2">
        <button onClick={handleDelete} disabled={deleting} className="btn-danger !px-3 !py-2 text-xs">
          {deleting ? "Deleting…" : "Confirm delete"}
        </button>
        <button onClick={() => setConfirming(false)} className="btn-secondary !px-3 !py-2 text-xs">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="btn-secondary !px-3 !py-2">
      <Trash2 size={16} />
    </button>
  );
}

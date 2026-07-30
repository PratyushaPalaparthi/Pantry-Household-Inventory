"use client";

import { Download } from "lucide-react";

export function ExportButtons() {
  return (
    <div className="flex gap-2">
      <a href="/api/export?format=json" download className="btn-secondary">
        <Download size={16} /> Export JSON
      </a>
      <a href="/api/export?format=csv" download className="btn-secondary">
        <Download size={16} /> Export CSV (.zip)
      </a>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const COLORS = ["#2f7a4f", "#5a8f3f", "#8aa63a", "#c9a227", "#c97a27", "#9aa093"];

export function CategorySpendChart({ data, categories }: { data: Record<string, number | string>[]; categories: string[] }) {
  const hasData = data.some((row) => categories.some((c) => typeof row[c] === "number" && (row[c] as number) > 0));

  if (!hasData) {
    return <p className="text-sm text-muted">No purchases logged yet — scan a receipt or restock an item to see spending trends.</p>;
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} width={40} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }}
            formatter={(value) => `$${Number(value).toFixed(2)}`}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {categories.map((cat, i) => (
            <Bar key={cat} dataKey={cat} stackId="spend" fill={COLORS[i % COLORS.length]} radius={i === categories.length - 1 ? [4, 4, 0, 0] : undefined} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

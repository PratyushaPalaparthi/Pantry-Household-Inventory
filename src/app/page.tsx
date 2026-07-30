import Link from "next/link";
import { Package, AlertTriangle, DollarSign, Clock, Copy } from "lucide-react";
import { getUserId } from "@/lib/session";
import { formatCalendarDate } from "@/lib/dates";
import { getDashboardData } from "@/lib/dashboard";
import { CategorySpendChart } from "@/components/CategorySpendChart";
import { NaturalLanguageBar } from "@/components/NaturalLanguageBar";
import { totalQuantity } from "@/lib/inventory";

function StatTile({ icon: Icon, label, value, danger }: { icon: typeof Package; label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted">
        <Icon size={14} /> {label}
      </div>
      <p className="text-2xl font-semibold" style={danger ? { color: "var(--danger)" } : undefined}>
        {value}
      </p>
    </div>
  );
}

export default async function Home() {
  const userId = await getUserId();
  if (!userId) return null;

  const data = await getDashboardData(userId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <NaturalLanguageBar />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Package} label="Items tracked" value={data.totalItems} />
        <StatTile icon={AlertTriangle} label="Low stock" value={data.lowStockCount} danger={data.lowStockCount > 0} />
        <StatTile icon={DollarSign} label="This month's spend" value={`$${data.monthlySpend.toFixed(2)}`} />
        <StatTile icon={Clock} label="Expiring soon" value={data.expiringItems.length} danger={data.expiringItems.length > 0} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-medium">Low stock</h2>
            <Link href="/shopping" className="text-xs" style={{ color: "var(--brand)" }}>
              View shopping list
            </Link>
          </div>
          {data.lowStockItems.length === 0 ? (
            <p className="text-sm text-muted">Nothing running low.</p>
          ) : (
            <ul className="space-y-2">
              {data.lowStockItems.map((item) => (
                <li key={item.id}>
                  <Link href={`/inventory/${item.id}`} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span style={{ color: "var(--danger)" }}>
                      {totalQuantity(item.locations)} / {item.lowStockThreshold} {item.unitOfMeasure}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 font-medium">Expiring soon</h2>
          {data.expiringItems.length === 0 ? (
            <p className="text-sm text-muted">Nothing expiring in the next 7 days.</p>
          ) : (
            <ul className="space-y-2">
              {data.expiringItems.map((item) => (
                <li key={item.id}>
                  <Link href={`/inventory/${item.id}`} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <span className="text-muted">{item.expirationDate ? formatCalendarDate(item.expirationDate) : null}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-medium">Spending by category</h2>
        <CategorySpendChart data={data.spendByCategory} categories={[...data.topCategories, "Other"]} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-medium">Most active items</h2>
          <p className="mb-2 text-xs text-muted">Restocked or used most in the last 30 days</p>
          {data.mostActiveItems.length === 0 ? (
            <p className="text-sm text-muted">No activity logged yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.mostActiveItems.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-sm">
                  <span>{item.name}</span>
                  <span className="text-muted">{item.count}x</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <div className="mb-3 flex items-center gap-1.5">
            <Copy size={15} />
            <h2 className="font-medium">Possible duplicates</h2>
          </div>
          {data.duplicateGroups.length === 0 ? (
            <p className="text-sm text-muted">No likely duplicates found.</p>
          ) : (
            <ul className="space-y-2">
              {data.duplicateGroups.map((g, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{g.a}</span> <span className="text-muted">looks similar to</span>{" "}
                  <span className="font-medium">{g.b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Receipt,
  ScanLine,
  Settings,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/shopping", label: "Shopping", icon: ShoppingCart },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/scan", label: "Scan", icon: ScanLine },
];

export function NavBar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  if (status !== "authenticated" || !session) return null;

  return (
    <>
      <header
        className="sticky top-0 z-40 hidden border-b backdrop-blur md:block"
        style={{ background: "color-mix(in srgb, var(--surface) 90%, transparent)", borderColor: "var(--border)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="text-xl">🏠</span> Pantry
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: active ? "var(--brand-soft)" : "transparent",
                    color: active ? "var(--brand)" : "var(--foreground)",
                  }}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/settings" className="btn-secondary !px-3 !py-2">
              <Settings size={16} />
            </Link>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="btn-secondary !px-3 !py-2">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t py-2 backdrop-blur md:hidden"
        style={{ background: "color-mix(in srgb, var(--surface) 92%, transparent)", borderColor: "var(--border)" }}
      >
        {[...NAV_ITEMS, { href: "/settings", label: "Settings", icon: Settings }].map(
          ({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium"
                style={{ color: active ? "var(--brand)" : "var(--muted)" }}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          }
        )}
      </nav>
    </>
  );
}

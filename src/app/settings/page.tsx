import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ExportButtons } from "@/components/ExportButtons";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const provider = process.env.AI_PROVIDER === "claude" ? "Claude API" : "Local Ollama";

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <div className="card p-5">
        <h2 className="mb-3 font-medium">Account</h2>
        <p className="text-sm text-muted">Signed in as</p>
        <p className="text-sm font-medium">{session?.user?.email}</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-medium">AI provider</h2>
        <p className="text-sm">
          Currently using <span className="font-medium">{provider}</span>
        </p>
        <p className="mt-1 text-xs text-muted">Change with the AI_PROVIDER environment variable and restart the app.</p>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 font-medium">Export your data</h2>
        <p className="mb-3 text-xs text-muted">
          Download everything — items, locations, price history, shopping list, and receipt metadata — so it&apos;s never
          locked into this app.
        </p>
        <ExportButtons />
      </div>
    </div>
  );
}

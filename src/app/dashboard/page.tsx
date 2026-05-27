import ClientDashboard from "./ui";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">
            v5: Today queue + user token control. Seed demo requer <code>AGENDAR_ENABLE_DEMO=1</code> no backend.
          </p>
        </header>
        <ClientDashboard />
      </div>
    </main>
  );
}

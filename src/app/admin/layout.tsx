"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/question-bank", label: "Banco de Questões", exact: false },
  { href: "/admin/keys", label: "Chaves de Acesso", exact: false },
  { href: "/admin/audit", label: "Auditoria", exact: false },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-surface border-b border-edge">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3 sm:flex-nowrap sm:gap-6">
          <button
            onClick={() => router.push("/")}
            className="text-sm text-muted hover:text-ink flex items-center gap-1"
          >
            ← Voltar
          </button>
          <nav className="order-3 flex w-full gap-1 overflow-x-auto pb-1 sm:order-none sm:w-auto sm:pb-0">
            {TABS.map(({ href, label, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`shrink-0 px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-surface text-ink"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <span className="ml-auto hidden text-xs font-medium uppercase tracking-wide text-muted sm:inline">
            Admin
          </span>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

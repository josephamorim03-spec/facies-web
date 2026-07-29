"use client";

import Link from "next/link";
import { Layers3, NotebookPen } from "lucide-react";

export function CardsSectionTabs({ active }: { active: "review" | "records" }) {
  const items = [
    { id: "review" as const, label: "Revisar", href: "/cards", Icon: Layers3 },
    {
      id: "records" as const,
      label: "Registros",
      href: "/cards/registros",
      Icon: NotebookPen,
    },
  ];

  return (
    <nav className="flex border-b border-edge" aria-label="Seções de Cards">
      {items.map(({ id, label, href, Icon }) => (
        <Link
          key={id}
          href={href}
          aria-current={active === id ? "page" : undefined}
          className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm font-semibold ${
            active === id
              ? "border-primary text-ink"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          <Icon className="h-4 w-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

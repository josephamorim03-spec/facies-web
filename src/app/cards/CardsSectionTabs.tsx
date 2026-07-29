"use client";

import Link from "next/link";
import { Layers3, NotebookPen } from "lucide-react";

import { TAB_LIST_CLASS, TAB_TRIGGER_CLASS, TabsScrollArea } from "@/components/ui/Tabs";

export function CardsSectionTabs({ active }: { active: "review" | "records" }) {
  const items = [
    { id: "review" as const, label: "Revisar", href: "/cards", Icon: Layers3 },
    { id: "records" as const, label: "Registros", href: "/cards/registros", Icon: NotebookPen },
  ];

  return (
    <TabsScrollArea>
      {({ ref, onScroll }) => (
        <nav ref={ref} onScroll={onScroll} className={TAB_LIST_CLASS} aria-label="Seções de Cards">
          {items.map(({ id, label, href, Icon }) => (
            <Link
              key={id}
              href={href}
              aria-current={active === id ? "page" : undefined}
              className={TAB_TRIGGER_CLASS}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      )}
    </TabsScrollArea>
  );
}

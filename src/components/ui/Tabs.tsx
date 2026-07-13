"use client";

import type { ComponentProps } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";

export function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />;
}

export function TabsList({ className = "", ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List {...props} className={`inline-flex max-w-full gap-1 overflow-x-auto rounded-lg border border-edge bg-surface p-1 ${className}`.trim()} />;
}

export function TabsTrigger({ className = "", ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return <TabsPrimitive.Trigger {...props} className={`paper-control min-h-9 whitespace-nowrap px-3 py-2 text-xs font-semibold text-muted hover:text-ink data-[state=active]:bg-primary data-[state=active]:text-primaryInk ${className}`.trim()} />;
}

export function TabsContent({ className = "", ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content {...props} className={`focus-visible:outline-none ${className}`.trim()} />;
}

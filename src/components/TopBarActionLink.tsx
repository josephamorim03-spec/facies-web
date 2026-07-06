"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type TopBarActionLinkProps = {
  href: string;
  label: string;
  title?: string;
  children: ReactNode;
  className?: string;
  testId?: string;
};

export function TopBarActionLink({
  href,
  label,
  title,
  children,
  className = "",
  testId,
}: TopBarActionLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={title ?? label}
      data-testid={testId}
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`.trim()}
    >
      {children}
    </Link>
  );
}

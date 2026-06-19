"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import { getAuthToken } from "@/lib/auth";
import { warmRoute, warmRouteData } from "@/lib/navigationWarmup";

type NavigateEvent = {
  preventDefault: () => void;
};

type FastNavLinkProps = Omit<ComponentProps<typeof Link>, "href" | "onNavigate"> & {
  href: string;
  onNavigateGuard?: (href: string, event: NavigateEvent) => boolean;
  warmData?: boolean;
  onAfterNavigate?: () => void;
};

export function FastNavLink({
  href,
  onNavigateGuard,
  warmData = true,
  onAfterNavigate,
  onMouseEnter,
  onFocus,
  onTouchStart,
  prefetch,
  ...props
}: FastNavLinkProps) {
  const router = useRouter();

  function warm() {
    warmRoute(href, router);
    if (warmData) warmRouteData(href, getAuthToken());
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={prefetch ?? "auto"}
      onNavigate={(event) => {
        const canNavigate = onNavigateGuard ? onNavigateGuard(href, event) : true;
        if (canNavigate) onAfterNavigate?.();
      }}
      onMouseEnter={(event) => {
        warm();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        warm();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        warm();
        onTouchStart?.(event);
      }}
    />
  );
}


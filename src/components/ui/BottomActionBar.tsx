import { type CSSProperties, type ReactNode } from "react";

export const BOTTOM_ACTION_BAR_RESERVE_CLASS =
  "pb-[calc(var(--bottom-action-bar-space)_+_1rem)] md:pb-0";

type BottomActionBarProps = {
  children: ReactNode;
  status?: ReactNode;
  maxWidthClassName?: string;
  className?: string;
  contentClassName?: string;
  hiddenOnMobile?: boolean;
};

const MOBILE_BAR_STYLE: CSSProperties = {
  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
};

export function BottomActionBar({
  children,
  status,
  maxWidthClassName = "max-w-lg",
  className = "",
  contentClassName = "",
  hiddenOnMobile = false,
}: BottomActionBarProps) {
  return (
    <div
      data-bottom-action-bar="true"
      className={[
        "fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-paper px-4 pt-3 shadow-[0_-6px_18px_rgba(0,0,0,0.06)]",
        "md:static md:border md:bg-surface md:p-3 md:shadow-soft",
        hiddenOnMobile ? "hidden md:block" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={MOBILE_BAR_STYLE}
    >
      <div
        className={[
          "mx-auto flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          maxWidthClassName,
          contentClassName,
        ].filter(Boolean).join(" ")}
      >
        {status ? <div className="min-w-0 text-sm">{status}</div> : null}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:ml-auto">{children}</div>
      </div>
    </div>
  );
}

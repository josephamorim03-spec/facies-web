type ProgressProps = {
  value: number;
  label: string;
  showValue?: boolean;
  className?: string;
};

export function Progress({ value, label, showValue = false, className = "" }: ProgressProps) {
  const safeValue = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={safeValue}
          className="h-1.5 flex-1 overflow-hidden bg-surfaceMuted"
        >
          <div className="h-full bg-primary transition-[width] duration-200 ease-out" style={{ width: `${safeValue}%` }} />
        </div>
        {showValue ? <span className="w-10 text-right text-xs tabular-nums text-muted">{safeValue}%</span> : null}
      </div>
    </div>
  );
}

import { forwardRef, useId, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const CONTROL =
  "w-full rounded-control border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted " +
  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** Input canônico com rótulo/erro/hint e foco por token. */
export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { label, hint, error, className = "", id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedBy = error ? `${inputId}-err` : hint ? `${inputId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL} ${error ? "border-danger" : "border-edge"} ${className}`.trim()}
        {...rest}
      />
      {error ? (
        <span id={`${inputId}-err`} className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span id={`${inputId}-hint`} className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
});

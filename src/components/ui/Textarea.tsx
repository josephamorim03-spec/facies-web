import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

const CONTROL =
  "w-full border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted " +
  "focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/25 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** Textarea canônico com rótulo/erro/hint e foco por token. */
export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { label, hint, error, className = "", id, ...rest },
  ref,
) {
  const autoId = useId();
  const taId = id ?? autoId;
  const describedBy = error ? `${taId}-err` : hint ? `${taId}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={taId} className="paper-eyebrow">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={taId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${CONTROL} ${error ? "border-danger" : "border-edge"} ${className}`.trim()}
        {...rest}
      />
      {error ? (
        <span id={`${taId}-err`} className="text-xs text-danger">{error}</span>
      ) : hint ? (
        <span id={`${taId}-hint`} className="text-xs text-muted">{hint}</span>
      ) : null}
    </div>
  );
});

export function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <p className="text-xs text-muted uppercase tracking-widest whitespace-nowrap">{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`text-xs rounded-xl px-2 py-0.5 border ${value === o.value ? "border-ink bg-ink text-paper" : "border-edge text-muted hover:border-primary"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

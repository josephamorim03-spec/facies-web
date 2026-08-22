"use client";

import { Select as SelectPrimitive } from "radix-ui";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type SelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function Select({ value, onValueChange, options, label, placeholder, disabled, className = "" }: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        aria-label={label}
        className={`paper-control flex min-h-11 w-full items-center justify-between gap-2 border border-edge bg-surface px-3 py-2 text-left text-sm text-ink hover:border-primary disabled:opacity-50 ${className}`.trim()}
      >
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon aria-hidden="true">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-muted"><path d="m6 8 4 4 4-4" /></svg>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content position="popper" sideOffset={6} className="paper-overlay z-[100] max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-control border border-edge bg-surface">
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="paper-control relative flex min-h-10 cursor-default select-none items-center py-2 pl-8 pr-3 text-sm text-ink outline-none data-[disabled]:opacity-40 data-[highlighted]:bg-surfaceMuted"
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 text-primary">✓</SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

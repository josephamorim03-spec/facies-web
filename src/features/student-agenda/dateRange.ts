export function localISO(value = new Date()): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

export function shiftISO(iso: string, days: number): string {
  const value = new Date(`${iso}T12:00:00`);
  value.setDate(value.getDate() + days);
  return localISO(value);
}

export function weekRange(anchor: string): { start: string; end: string } {
  const value = new Date(`${anchor}T12:00:00`);
  const mondayOffset = (value.getDay() + 6) % 7;
  return {
    start: shiftISO(anchor, -mondayOffset),
    end: shiftISO(anchor, 6 - mondayOffset),
  };
}

export function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

export function formatWeekday(iso: string): string {
  const label = new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", {
    weekday: "long",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

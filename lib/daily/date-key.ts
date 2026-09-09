/** Local-calendar date helpers. Every daily feature keys off "YYYY-MM-DD". */

export type DateKey = string;

export function toDateKey(date: Date = new Date()): DateKey {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

export function daysBetween(from: DateKey, to: DateKey): number {
  const a = fromDateKey(from).getTime();
  const b = fromDateKey(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function weekdayLabel(key: DateKey): string {
  return WEEKDAYS[fromDateKey(key).getDay()];
}

/** The seven date keys of the Monday-first week containing `key`. */
export function weekOf(key: DateKey): DateKey[] {
  const date = fromDateKey(key);
  const offsetToMonday = (date.getDay() + 6) % 7;
  const monday = addDays(key, -offsetToMonday);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

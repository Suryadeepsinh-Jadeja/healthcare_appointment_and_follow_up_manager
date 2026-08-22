const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function hasWorkingHoursOnDay(workingHours: Record<string, string[]> | undefined, date: Date): boolean {
  if (!workingHours) return true;
  const windows = workingHours[DAY_KEYS[date.getDay()]];
  return Boolean(windows && windows.length > 0);
}

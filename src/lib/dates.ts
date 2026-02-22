// Store policy: thaw day counts as Day 1.
// Write-on date = thawDate + (shelfLifeDays - 1)

export function startOfDayLocal(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDaysLocal(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function computeWriteDate(thawDate: Date, shelfLifeDays: number) {
  const base = startOfDayLocal(thawDate);
  const offset = Math.max(0, shelfLifeDays);
  return addDaysLocal(base, offset);
}

export function formatGunDate(date: Date) {
  return date.toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

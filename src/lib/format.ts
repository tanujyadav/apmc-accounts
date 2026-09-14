export function inr(value: string | number | null | undefined): string {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  if (isNaN(n as number)) return "₹0.00";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(n as number);
}

export function num(value: string | number | null | undefined): number {
  const n = typeof value === "string" ? parseFloat(value) : value ?? 0;
  return isNaN(n as number) ? 0 : (n as number);
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d + "T00:00:00") : d;
  if (isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function currentFY(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 3 ? y : y - 1; // FY starts April
  return `${start}-${String(start + 1).slice(2)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Return the Indian financial year (April–March) for an ISO date. */
export function financialYearForDate(isoDate: string): string {
  const [yearPart, monthPart] = isoDate.split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return currentFY();
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

export function monthYearLabel(isoDate: string): string {
  const date = new Date(`${isoDate.slice(0, 7)}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate.slice(0, 7);
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function financialYearRange(fromDate: string, toDate: string): string {
  const fromFY = financialYearForDate(fromDate);
  const toFY = financialYearForDate(toDate);
  return fromFY === toFY ? fromFY : `${fromFY} से ${toFY}`;
}

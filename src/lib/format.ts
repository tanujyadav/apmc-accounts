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

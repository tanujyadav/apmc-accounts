const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const tens = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety",
];

function twoDigits(n: number): string {
  if (n < 20) return ones[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return tens[t] + (o ? " " + ones[o] : "");
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let out = "";
  if (h) out += ones[h] + " Hundred";
  if (rest) out += (out ? " " : "") + twoDigits(rest);
  return out;
}

/** Convert a number to words using the Indian numbering system (Crore/Lakh). */
export function amountInWords(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(n)) return "";
  const rupees = Math.floor(Math.abs(n));
  const paise = Math.round((Math.abs(n) - rupees) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  let r = rupees;
  const crore = Math.floor(r / 10000000);
  r %= 10000000;
  const lakh = Math.floor(r / 100000);
  r %= 100000;
  const thousand = Math.floor(r / 1000);
  r %= 1000;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(twoDigits(lakh) + " Lakh");
  if (thousand) parts.push(twoDigits(thousand) + " Thousand");
  if (r) parts.push(threeDigits(r));

  let out = parts.length ? "Rupees " + parts.join(" ") : "";
  if (paise) out += (out ? " and " : "") + twoDigits(paise) + " Paise";
  return out + " Only";
}

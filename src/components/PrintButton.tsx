"use client";

export default function PrintButton({ label = "🖨️ Print Voucher" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
    >
      {label}
    </button>
  );
}

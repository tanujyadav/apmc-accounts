"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteBillButton({
  id,
  billNo,
  approved,
  financialYear,
}: {
  id: number;
  billNo: string;
  approved: boolean;
  financialYear: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function removeBill() {
    const warning = approved
      ? `Approved Bill ${billNo} delete करें?\n\nLinked Cashbook/Ledger posting, Net/Deduction issued cheques और Budget expense reverse होंगे।`
      : `Draft Bill ${billNo} delete करें?`;
    if (!window.confirm(warning)) return;
    const pin = window.prompt("Bill delete के लिए Security PIN दर्ज करें:");
    if (pin === null) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/bills/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
        deletedCheques?: number;
        reversedCashbook?: boolean;
      };
      if (!response.ok || !result.success) {
        window.alert(
          response.status === 401
            ? "गलत Security PIN। Bill delete नहीं हुआ।"
            : result.error || "Bill delete नहीं हुआ।",
        );
        return;
      }
      window.alert(
        `Bill ${billNo} deleted.\nCheque entries deleted: ${
          result.deletedCheques ?? 0
        }\nCashbook posting reversed: ${result.reversedCashbook ? "Yes" : "Not applicable"}`,
      );
      router.replace(
        `/bills-budget?fy=${encodeURIComponent(financialYear)}&billDeleted=1`,
      );
      router.refresh();
    } catch {
      window.alert("Server connection error. Bill delete नहीं हुआ।");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={removeBill}
      disabled={deleting}
      className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:text-slate-400"
    >
      {deleting ? "Deleting…" : "🗑️ Delete Bill"}
    </button>
  );
}

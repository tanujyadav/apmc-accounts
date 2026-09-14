"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteDepositButton({
  id,
  slipNo,
  amount,
}: {
  id: number;
  slipNo: string;
  amount: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    if (
      !window.confirm(
        `Deposit Slip ${slipNo} (${amount}) delete करें?\n\nAllocated cash फिर से pending deposit balance में आ जाएगा।`,
      )
    ) {
      return;
    }
    const pin = window.prompt("Cash deposit delete के लिए Security PIN दर्ज करें:");
    if (pin === null) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/deposits/${id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || !result.success) {
        window.alert(
          response.status === 401
            ? "गलत Security PIN। Deposit delete नहीं हुआ।"
            : result.error || "Deposit delete नहीं हो सका।",
        );
        return;
      }
      window.alert(`Deposit Slip ${slipNo} successfully deleted.`);
      router.replace("/deposits?deposit=deleted");
      router.refresh();
    } catch {
      window.alert("Server connection error. Deposit delete नहीं हुआ।");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={deleting}
      className="whitespace-nowrap text-xs font-semibold text-red-600 hover:text-red-800 disabled:text-slate-400"
    >
      {deleting ? "Deleting…" : "Delete Deposit"}
    </button>
  );
}

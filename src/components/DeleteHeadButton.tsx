"use client";

import { deleteLedgerHead } from "@/lib/actions";
import PinProtectedForm from "@/components/PinProtectedForm";

export default function DeleteHeadButton({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  return (
    <PinProtectedForm
      action={deleteLedgerHead}
      purpose="Head delete"
      confirmMessage={`Delete “${name}”?\n\nThis will also permanently delete linked Cashbook entries, bills, budgets and revenue targets. This action cannot be undone.`}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs font-semibold text-red-600 hover:text-red-800"
        title="Permanently delete head"
      >
        🗑️ Delete
      </button>
    </PinProtectedForm>
  );
}

"use client";

import { deleteLedgerHead } from "@/lib/actions";

export default function DeleteHeadButton({
  id,
  name,
}: {
  id: number;
  name: string;
}) {
  return (
    <form
      action={deleteLedgerHead}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Delete “${name}”?\n\nThis will also permanently delete all cashbook entries, bills and budgets linked to this head. This action cannot be undone.`,
        );
        if (!confirmed) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-xs font-semibold text-red-600 hover:text-red-800"
        title="Permanently delete head"
      >
        🗑️ Delete
      </button>
    </form>
  );
}

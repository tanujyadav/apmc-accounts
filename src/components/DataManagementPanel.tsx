"use client";

import { useState } from "react";

type FileHandle = {
  createWritable: () => Promise<{
    write: (data: Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type PickerWindow = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string;
    types: Array<{
      description: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<FileHandle>;
};

export default function DataManagementPanel() {
  const [busy, setBusy] = useState<"backup" | "reset" | null>(null);
  const [message, setMessage] = useState("");

  async function downloadBackup() {
    const pin = window.prompt("Backup बनाने के लिए Security PIN दर्ज करें:");
    if (pin === null) return;
    setBusy("backup");
    setMessage("");
    try {
      const response = await fetch("/api/backup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        window.alert(response.status === 401 ? "गलत Security PIN।" : "Backup नहीं बन सका।");
        return;
      }
      const blob = await response.blob();
      const date = new Date().toISOString().slice(0, 10);
      const filename = `APMC-Accounts-Backup-${date}.json`;
      const pickerWindow = window as PickerWindow;

      if (pickerWindow.showSaveFilePicker) {
        try {
          const handle = await pickerWindow.showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: "APMC Accounts Backup",
                accept: { "application/json": [".json"] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setMessage("✓ Backup सफलतापूर्वक save हो गया। Pen Drive चुनी थी तो file वहीं सुरक्षित है।");
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return;
        }
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMessage("✓ Backup Downloads folder में save हुआ। इसे Pen Drive में copy कर लें।");
    } catch {
      window.alert("Backup बनाते समय connection error आया।");
    } finally {
      setBusy(null);
    }
  }

  async function resetData() {
    const warning = window.confirm(
      "सभी accounting entries, profile, parties, banks, BRS, bills, rent, salary और TDS data स्थायी रूप से delete होंगे।\n\nIncome/Expense Head Master और Security PIN सुरक्षित रहेंगे।\n\nक्या आप आगे बढ़ना चाहते हैं?",
    );
    if (!warning) return;
    const confirmation = window.prompt('पुष्टि के लिए बड़े अक्षरों में "RESET" लिखें:');
    if (confirmation !== "RESET") {
      window.alert("RESET confirmation सही नहीं है। Data delete नहीं किया गया।");
      return;
    }
    const pin = window.prompt("Data reset के लिए Security PIN दर्ज करें:");
    if (pin === null) return;
    setBusy("reset");
    setMessage("");
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin, confirmation }),
      });
      const result = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !result.success) {
        window.alert(response.status === 401 ? "गलत Security PIN।" : result.error || "Reset failed.");
        return;
      }
      window.alert("सभी operational data reset हो गया है।");
      window.location.href = "/settings";
    } catch {
      window.alert("Reset करते समय connection error आया।");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">💾 Database Backup / Pen Drive Backup</h3>
          <p className="mt-2 text-sm text-blue-800">
            सभी office और accounting data की एक backup file बनाएँ। Save dialog में अपनी Pen Drive चुनें।
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={downloadBackup}
            className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-300"
          >
            {busy === "backup" ? "Creating Backup…" : "Download / Save Backup"}
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h3 className="font-bold text-red-900">⚠️ Reset Complete Operational Data</h3>
          <p className="mt-2 text-sm text-red-800">
            Profile, parties, banks, Opening Balance और सभी transactions हटेंगे। Account Head Master तथा Security PIN सुरक्षित रहेंगे। Reset के बाद Initial Opening Balance setup फिर उपलब्ध होगा। पहले Backup अवश्य लें।
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={resetData}
            className="mt-4 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:bg-slate-300"
          >
            {busy === "reset" ? "Resetting…" : "Reset All Operational Data"}
          </button>
        </div>
      </div>
      {message && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {message}
        </p>
      )}
    </div>
  );
}

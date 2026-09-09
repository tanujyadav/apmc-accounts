"use client";

import { useRef, useState } from "react";

const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const labelCls = "mb-1 block text-xs font-semibold text-slate-600";

/**
 * A pair of inputs: an English name field and a Hindi name field.
 * When the user finishes typing the English name, the Hindi field is
 * auto-filled via /api/transliterate (unless the user has edited it manually).
 */
export default function HindiField({
  nameField = "name",
  hindiField = "nameHindi",
  label = "Name (English)",
  hindiLabel = "Name (हिन्दी) — auto",
  placeholder = "",
  required = false,
  defaultName = "",
  defaultHindi = "",
}: {
  nameField?: string;
  hindiField?: string;
  label?: string;
  hindiLabel?: string;
  placeholder?: string;
  required?: boolean;
  defaultName?: string;
  defaultHindi?: string;
}) {
  const [hindi, setHindi] = useState(defaultHindi);
  const [loading, setLoading] = useState(false);
  const manuallyEdited = useRef(false);
  const lastSource = useRef(defaultName);

  async function transliterate(text: string) {
    const value = text.trim();
    // Skip if unchanged, empty, or the user typed their own Hindi
    if (!value || value === lastSource.current || manuallyEdited.current) return;
    lastSource.current = value;
    setLoading(true);
    try {
      const res = await fetch(`/api/transliterate?text=${encodeURIComponent(value)}`);
      const data = (await res.json()) as { hindi: string };
      if (data.hindi && !manuallyEdited.current) setHindi(data.hindi);
    } catch {
      // ignore — user can type Hindi manually
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <label className={labelCls}>{label}</label>
        <input
          name={nameField}
          defaultValue={defaultName}
          placeholder={placeholder}
          required={required}
          className={inputCls}
          onBlur={(e) => transliterate(e.target.value)}
        />
      </div>
      <div>
        <label className={labelCls}>
          {hindiLabel} {loading && <span className="text-emerald-600">⏳</span>}
        </label>
        <input
          name={hindiField}
          value={hindi}
          placeholder="स्वतः हिन्दी में"
          className={inputCls}
          onChange={(e) => {
            manuallyEdited.current = e.target.value.length > 0;
            setHindi(e.target.value);
          }}
        />
      </div>
    </div>
  );
}

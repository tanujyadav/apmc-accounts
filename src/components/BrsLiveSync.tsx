"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function BrsLiveSync() {
  const router = useRouter();
  const [seconds, setSeconds] = useState(30);

  useEffect(() => {
    const countdown = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          router.refresh();
          return 30;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(countdown);
  }, [router]);

  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
        Live sync · {seconds}s
      </span>
      <button
        type="button"
        onClick={() => {
          router.refresh();
          setSeconds(30);
        }}
        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
      >
        ↻ Refresh Now
      </button>
    </div>
  );
}

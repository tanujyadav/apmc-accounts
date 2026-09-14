"use client";

import {
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

type ServerAction = (formData: FormData) => void | Promise<void>;

export default function PinProtectedForm({
  action,
  children,
  className,
  confirmMessage,
  purpose = "इस बदलाव",
  enabled = true,
}: {
  action: ServerAction;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  purpose?: string;
  enabled?: boolean;
}) {
  const pinRef = useRef<HTMLInputElement>(null);
  const bypassRef = useRef(false);
  const [checking, setChecking] = useState(false);

  async function protect(event: FormEvent<HTMLFormElement>) {
    if (!enabled) return;
    if (bypassRef.current) {
      bypassRef.current = false;
      return;
    }
    event.preventDefault();
    const form = event.currentTarget;
    if (confirmMessage && !window.confirm(confirmMessage)) return;

    const pin = window.prompt(`${purpose} के लिए Security PIN दर्ज करें:`);
    if (pin === null) return;
    setChecking(true);
    try {
      const response = await fetch("/api/security/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const result = (await response.json()) as { valid?: boolean };
      if (!response.ok || !result.valid) {
        window.alert("गलत Security PIN। Action पूरा नहीं किया गया।");
        return;
      }
      if (pinRef.current) pinRef.current.value = pin;
      bypassRef.current = true;
      form.requestSubmit();
    } catch {
      window.alert("PIN verify नहीं हो सका। Internet/server connection check करें।");
    } finally {
      setChecking(false);
    }
  }

  return (
    <form action={action} className={className} onSubmit={protect}>
      <input ref={pinRef} type="hidden" name="securityPin" />
      <fieldset
        aria-disabled={checking}
        aria-busy={checking}
        className={checking ? "contents opacity-60" : "contents"}
      >
        {children}
      </fieldset>
    </form>
  );
}

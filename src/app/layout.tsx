import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { db } from "@/db";
import { apmcProfile } from "@/db/schema";
import "./globals.css";

// The Mandi name in the sidebar is live data, and every page needs a real
// per-request DB connection anyway (session/auth, live figures) — forcing
// dynamic rendering here stops Next.js from ever trying to hit the database
// during the build itself (which fails the whole build if Neon is briefly
// unreachable at that exact moment, e.g. a cold start).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "APMC Uttar Pradesh — Accounts Dashboard",
  description:
    "Accounting dashboard for Agriculture Produce Market Committee (Mandi Samiti), Uttar Pradesh — Cashbook, Ledger, BRS, Reports, Banking, Cheques, Deposits, Bills & Budget.",
  icons: {
    icon: "/images/apmc-seal.svg",
    shortcut: "/images/apmc-seal.svg",
    apple: "/images/apmc-seal.svg",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  let apmcName = "APMC Profile Not Set";
  try {
    const [profile] = await db.select().from(apmcProfile).limit(1);
    if (profile?.mandiName) apmcName = profile.mandiName;
  } catch {
    // Sidebar name is cosmetic — don't take down every page over it.
  }

  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <AppShell apmcName={apmcName}>{children}</AppShell>
      </body>
    </html>
  );
}

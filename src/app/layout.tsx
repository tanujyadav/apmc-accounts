import type { Metadata } from "next";
import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";
import { db } from "@/db";
import { apmcProfile } from "@/db/schema";
import "./globals.css";

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
  const [profile] = await db.select().from(apmcProfile).limit(1);
  const apmcName = profile?.mandiName || "APMC Profile Not Set";

  return (
    <html lang="en">
      <body className="bg-slate-100 text-slate-900 antialiased">
        <AppShell apmcName={apmcName}>{children}</AppShell>
      </body>
    </html>
  );
}

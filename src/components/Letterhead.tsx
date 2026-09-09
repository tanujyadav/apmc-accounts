import Image from "next/image";
import { db } from "@/db";
import { apmcProfile } from "@/db/schema";

export default async function Letterhead({ badge }: { badge: string }) {
  const [profile] = await db.select().from(apmcProfile).limit(1);

  const line2 = [
    profile?.address,
    profile?.district,
    profile?.state ?? "Uttar Pradesh",
    profile?.pincode,
  ]
    .filter(Boolean)
    .join(", ");

  const line3 = [
    profile?.phone ? `Ph: ${profile.phone}` : null,
    profile?.email ? `Email: ${profile.email}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-b-2 border-slate-800 pb-4 text-center">
      <div className="grid grid-cols-[76px_1fr_76px] items-center gap-3">
        <Image
          src="/images/apmc-seal.svg"
          alt="Uttar Pradesh Mandi Parishad seal"
          width={76}
          height={76}
          priority
          className="h-[76px] w-[76px] object-contain"
        />
        <div>
          <p className="text-sm font-bold tracking-wide text-emerald-700">
            {profile?.mandiNameHindi ?? "राज्य कृषि उत्पादन मण्डी परिषद्, उत्तर प्रदेश"}
          </p>
          <h1 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
            {profile?.mandiName ?? "Agriculture Produce Market Committee"}
          </h1>
          <p className="text-sm text-slate-600">
            {line2 || "Krishi Utpadan Mandi Samiti · Uttar Pradesh"}
          </p>
          {line3 && <p className="mt-0.5 text-xs text-slate-500">{line3}</p>}
        </div>
        <div aria-hidden="true" />
      </div>
      <div className="mt-3 inline-block rounded border-2 border-slate-800 px-6 py-1">
        <span className="text-base font-bold uppercase tracking-wider">{badge}</span>
      </div>
    </div>
  );
}

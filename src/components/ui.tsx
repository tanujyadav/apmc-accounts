import type { ReactNode } from "react";

export function PageHeader({
  title,
  hindi,
  subtitle,
}: {
  title: string;
  hindi?: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {hindi && <span className="text-lg font-medium text-emerald-700">{hindi}</span>}
      </div>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="border-b border-slate-100 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {title}
          </h2>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = "emerald",
}: {
  label: string;
  value: string;
  icon: string;
  accent?: "emerald" | "red" | "blue" | "amber";
}) {
  const colors: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
    amber: "bg-amber-100 text-amber-700",
  };
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl ${colors[accent]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className="truncate text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-600 ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  className = "",
}: {
  children: ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`whitespace-nowrap border-b border-slate-100 px-3 py-2.5 text-sm text-slate-700 ${
        right ? "text-right tabular-nums" : "text-left"
      } ${className}`}
    >
      {children}
    </td>
  );
}

export function Badge({
  children,
  color = "slate",
}: {
  children: ReactNode;
  color?: "green" | "red" | "amber" | "blue" | "slate";
}) {
  const map: Record<string, string> = {
    green: "bg-emerald-100 text-emerald-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
    blue: "bg-blue-100 text-blue-800",
    slate: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[color]}`}>
      {children}
    </span>
  );
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  );
}

export const inputCls =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
export const labelCls = "mb-1 block text-xs font-semibold text-slate-600";
export const btnCls =
  "inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700";

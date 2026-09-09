import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; error?: string }>;
}) {
  const params = await searchParams;
  const from = params.from && params.from.startsWith("/") ? params.from : "/";
  const hasError = params.error === "1";

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-950 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-emerald-950">APMC Accounts Login</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mandi Samiti Accounts — अधिकृत उपयोगकर्ता ही लॉगिन करें
          </p>
        </div>
        {hasError && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            गलत username या password। कृपया दोबारा प्रयास करें।
          </p>
        )}
        <form action={login} className="space-y-4">
          <input type="hidden" name="from" value={from} />
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              name="username"
              required
              autoFocus
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}

import { pool } from "@/db";
import { verifySecurityPin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { pin?: string };
    if (!(await verifySecurityPin(String(body.pin ?? "")))) {
      return Response.json({ error: "Invalid security PIN" }, { status: 401 });
    }

    const tableResult = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public'
         AND tablename <> 'app_security_settings'
       ORDER BY tablename`,
    );
    const data: Record<string, unknown[]> = {};
    for (const { tablename } of tableResult.rows) {
      const safeName = `"${tablename.replaceAll('"', '""')}"`;
      const result = await pool.query(`SELECT * FROM ${safeName} ORDER BY 1`);
      data[tablename] = result.rows;
    }

    const now = new Date();
    const date = now.toISOString().slice(0, 10);
    const payload = JSON.stringify(
      {
        application: "APMC Uttar Pradesh Accounts",
        backupVersion: 1,
        createdAt: now.toISOString(),
        note: "Security PIN hash is intentionally excluded.",
        tables: data,
      },
      null,
      2,
    );

    return new Response(payload, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="APMC-Accounts-Backup-${date}.json"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "Backup could not be created" }, { status: 500 });
  }
}

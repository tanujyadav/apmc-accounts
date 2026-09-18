import { pool } from "@/db";
import { isSecurityPinStillDefault, verifySecurityPin } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      pin?: string;
      confirmation?: string;
    };
    if (await isSecurityPinStillDefault()) {
      return Response.json(
        { error: "Change the default Security PIN in Settings before using Reset" },
        { status: 403 },
      );
    }
    if (!(await verifySecurityPin(String(body.pin ?? "")))) {
      return Response.json({ error: "Invalid security PIN" }, { status: 401 });
    }
    if (body.confirmation !== "RESET") {
      return Response.json({ error: "RESET confirmation is required" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const before = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM ledger_heads",
      );
      await client.query(`
        TRUNCATE TABLE
          cash_deposit_allocations,
          cash_deposits,
          cashbook_entries,
          cashbook_opening_balances,
          brs_statements,
          cheques,
          budgets,
          bills,
          bill_number_counters,
          shop_collections,
          shops,
          staff_payments,
          staff_members,
          tds_returns,
          revenue_targets,
          bank_accounts,
          parties,
          apmc_profile
        RESTART IDENTITY CASCADE
      `);
      const after = await client.query<{ count: string }>(
        "SELECT COUNT(*)::text AS count FROM ledger_heads",
      );
      if (before.rows[0]?.count !== after.rows[0]?.count) {
        throw new Error("Income/Expense Head Master safety check failed");
      }
      await client.query("COMMIT");
      return Response.json({
        success: true,
        preservedLedgerHeads: Number(after.rows[0]?.count ?? 0),
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch {
    return Response.json({ error: "Data reset failed" }, { status: 500 });
  }
}

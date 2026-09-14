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

    await pool.query(`
      TRUNCATE TABLE
        cash_deposit_allocations,
        cash_deposits,
        cashbook_entries,
        cashbook_opening_balances,
        brs_statements,
        cheques,
        budgets,
        bills,
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

    return Response.json({ success: true });
  } catch {
    return Response.json({ error: "Data reset failed" }, { status: 500 });
  }
}

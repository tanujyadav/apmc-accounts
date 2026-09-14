import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { cashDepositAllocations, cashDeposits } from "@/db/schema";
import { verifySecurityPin } from "@/lib/security";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const body = (await request.json()) as { pin?: string };
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid deposit ID" }, { status: 400 });
    }
    if (!(await verifySecurityPin(String(body.pin ?? "")))) {
      return NextResponse.json({ error: "Invalid security PIN" }, { status: 401 });
    }

    let deleted = false;
    await db.transaction(async (tx) => {
      await tx
        .delete(cashDepositAllocations)
        .where(eq(cashDepositAllocations.cashDepositId, id));
      const result = await tx
        .delete(cashDeposits)
        .where(eq(cashDeposits.id, id))
        .returning({ id: cashDeposits.id });
      deleted = result.length === 1;
      if (!deleted) throw new Error("Deposit not found");
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deposit deletion failed";
    const status = message === "Deposit not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

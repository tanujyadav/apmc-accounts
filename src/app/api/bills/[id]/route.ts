import { NextResponse } from "next/server";
import { and, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { bills, cashbookEntries, cheques } from "@/db/schema";
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
      return NextResponse.json({ error: "Invalid Bill ID" }, { status: 400 });
    }
    if (!(await verifySecurityPin(String(body.pin ?? "")))) {
      return NextResponse.json({ error: "Invalid security PIN" }, { status: 401 });
    }

    let reversedCashbook = false;
    let deletedCheques = 0;
    await db.transaction(async (tx) => {
      const [bill] = await tx
        .select()
        .from(bills)
        .where(eq(bills.id, id))
        .limit(1);
      if (!bill) throw new Error("Bill not found");

      const linked = await tx
        .delete(cheques)
        .where(eq(cheques.sourceBillId, bill.id))
        .returning({ id: cheques.id });
      deletedCheques += linked.length;

      const legacyChequeNumbers = [bill.chequeNo, bill.deductionChequeNo].filter(
        (value): value is string => Boolean(value),
      );
      if (legacyChequeNumbers.length > 0 && bill.bankAccountId) {
        const legacy = await tx
          .delete(cheques)
          .where(
            and(
              isNull(cheques.sourceBillId),
              eq(cheques.direction, "issued"),
              eq(cheques.bankAccountId, bill.bankAccountId),
              inArray(cheques.chequeNo, legacyChequeNumbers),
              or(
                ilike(cheques.remarks, `%Bill ${bill.billNo}%`),
                ilike(cheques.remarks, `%Bill ${bill.id}%`),
              ),
            ),
          )
          .returning({ id: cheques.id });
        deletedCheques += legacy.length;
      }

      if (bill.postedCashbookEntryId) {
        await tx
          .update(bills)
          .set({ postedCashbookEntryId: null })
          .where(eq(bills.id, bill.id));
        const reversed = await tx
          .delete(cashbookEntries)
          .where(eq(cashbookEntries.id, bill.postedCashbookEntryId))
          .returning({ id: cashbookEntries.id });
        reversedCashbook = reversed.length === 1;
      }

      const deleted = await tx
        .delete(bills)
        .where(eq(bills.id, bill.id))
        .returning({ id: bills.id });
      if (deleted.length !== 1) throw new Error("Bill deletion failed");
    });

    return NextResponse.json({
      success: true,
      deletedBillId: id,
      deletedCheques,
      reversedCashbook,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bill deletion failed";
    return NextResponse.json(
      { error: message },
      { status: message === "Bill not found" ? 404 : 500 },
    );
  }
}

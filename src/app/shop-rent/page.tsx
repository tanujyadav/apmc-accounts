import PinProtectedForm from "@/components/PinProtectedForm";
import { db } from "@/db";
import { shops, shopCollections } from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import {
  addShop,
  addShopCollection,
  updateShopCollection,
  updateShopStatus,
  deleteShop,
  deleteShopCollection,
} from "@/lib/actions";
import { fmtDate, inr, num, todayISO } from "@/lib/format";
import {
  Badge,
  Card,
  EmptyRow,
  PageHeader,
  StatCard,
  Td,
  Th,
  btnCls,
  inputCls,
  labelCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const currentMonth = () => new Date().toISOString().slice(0, 7);

const collectionColor = (status: string) =>
  status === "paid" ? "green" : status === "partial" ? "amber" : "red";

export default async function ShopRentPage() {
  const [shopRows, collections] = await Promise.all([
    db.select().from(shops).orderBy(asc(shops.shopNumber)),
    db
      .select()
      .from(shopCollections)
      .orderBy(desc(shopCollections.demandMonth), desc(shopCollections.id)),
  ]);
  const shopMap = new Map(shopRows.map((shop) => [shop.id, shop]));

  const totalDemand = collections.reduce(
    (sum, row) =>
      sum + num(row.rentAmount) + num(row.premiumAmount) + num(row.penaltyAmount),
    0,
  );
  const totalCollected = collections.reduce((sum, row) => sum + num(row.amountPaid), 0);
  const outstanding = totalDemand - totalCollected;

  return (
    <div>
      <PageHeader
        title="Shop Rent & Premium"
        hindi="दुकान किराया एवं प्रीमियम"
        subtitle="Property allotment, monthly demand, premium and collection register"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Properties" value={String(shopRows.filter((s) => s.status === "active").length)} icon="🏪" accent="blue" />
        <StatCard label="Total Demand" value={inr(totalDemand)} icon="📄" accent="amber" />
        <StatCard label="Total Collected" value={inr(totalCollected)} icon="💰" accent="emerald" />
        <StatCard label="Outstanding" value={inr(outstanding)} icon="⏳" accent="red" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Add Shop / Property">
          <form action={addShop} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Shop / Property No. *</label>
              <input name="shopNumber" placeholder="A-01" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Block / Location</label>
              <input name="block" placeholder="Block A" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Property Type</label>
              <select name="propertyType" className={inputCls}>
                <option value="shop">Shop / दुकान</option>
                <option value="godown">Godown / गोदाम</option>
                <option value="canteen">Canteen / कैंटीन</option>
                <option value="other">Other / अन्य</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Occupant / Allottee *</label>
              <input name="occupantName" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mobile</label>
              <input name="mobile" inputMode="tel" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Monthly Rent (₹)</label>
              <input type="number" min="0" step="0.01" name="monthlyRent" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Agreement Start</label>
              <input type="date" name="agreementStart" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Agreement End</label>
              <input type="date" name="agreementEnd" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Total Premium (₹)</label>
              <input type="number" min="0" step="0.01" name="premiumTotal" defaultValue="0" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button className={btnCls + " w-full"}>Add Property</button>
            </div>
          </form>
        </Card>

        <Card title="Add Monthly Demand / Collection">
          <form action={addShopCollection} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Shop / Occupant *</label>
              <select name="shopId" required className={inputCls}>
                <option value="">-- select property --</option>
                {shopRows.filter((s) => s.status === "active").map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.shopNumber} · {shop.occupantName} · Rent {inr(shop.monthlyRent)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Demand Month *</label>
              <input type="month" name="demandMonth" defaultValue={currentMonth()} required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Rent Demand (₹)</label>
              <input type="number" min="0" step="0.01" name="rentAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Premium Due (₹)</label>
              <input type="number" min="0" step="0.01" name="premiumAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Penalty / Interest (₹)</label>
              <input type="number" min="0" step="0.01" name="penaltyAmount" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Amount Received (₹)</label>
              <input type="number" min="0" step="0.01" name="amountPaid" defaultValue="0" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Receipt Date</label>
              <input type="date" name="receiptDate" defaultValue={todayISO()} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Receipt No.</label>
              <input name="receiptNo" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Payment Mode</label>
              <select name="paymentMode" className={inputCls}>
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Remarks</label>
              <input name="remarks" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <button className={btnCls + " w-full"}>Save Demand / Collection</button>
            </div>
          </form>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Rent & Premium Collection Register">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Month</Th>
                  <Th>Property / Occupant</Th>
                  <Th right>Rent</Th>
                  <Th right>Premium</Th>
                  <Th right>Penalty</Th>
                  <Th right>Demand</Th>
                  <Th right>Received</Th>
                  <Th right>Balance</Th>
                  <Th>Status / Collection</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {collections.length === 0 && (
                  <EmptyRow colSpan={10} message="No monthly rent or premium demand recorded yet." />
                )}
                {collections.map((row) => {
                  const shop = shopMap.get(row.shopId);
                  const demand = num(row.rentAmount) + num(row.premiumAmount) + num(row.penaltyAmount);
                  const balance = demand - num(row.amountPaid);
                  return (
                    <tr key={row.id} className="align-top hover:bg-slate-50">
                      <Td>{row.demandMonth}</Td>
                      <Td>
                        <span className="font-semibold">{shop?.shopNumber ?? "-"}</span>
                        <br />
                        <span className="text-xs text-slate-500">{shop?.occupantName ?? "-"}</span>
                      </Td>
                      <Td right>{inr(row.rentAmount)}</Td>
                      <Td right>{inr(row.premiumAmount)}</Td>
                      <Td right>{inr(row.penaltyAmount)}</Td>
                      <Td right className="font-semibold">{inr(demand)}</Td>
                      <Td right className="font-semibold text-emerald-700">{inr(row.amountPaid)}</Td>
                      <Td right className={balance > 0 ? "font-bold text-red-600" : "font-semibold text-emerald-700"}>
                        {inr(Math.max(0, balance))}
                      </Td>
                      <Td>
                        <Badge color={collectionColor(row.status)}>{row.status}</Badge>
                        {row.status !== "paid" && (
                          <PinProtectedForm action={updateShopCollection} className="mt-2 grid min-w-56 grid-cols-2 gap-1">
                            <input type="hidden" name="id" value={row.id} />
                            <input type="hidden" name="rentAmount" value={row.rentAmount} />
                            <input type="hidden" name="premiumAmount" value={row.premiumAmount} />
                            <input type="hidden" name="penaltyAmount" value={row.penaltyAmount} />
                            <input type="date" name="receiptDate" defaultValue={todayISO()} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                            <input name="receiptNo" placeholder="Receipt no." className="rounded border border-slate-300 px-2 py-1 text-xs" />
                            <input type="number" min="0" step="0.01" name="amountPaid" defaultValue={row.amountPaid} placeholder="Paid amount" className="rounded border border-slate-300 px-2 py-1 text-xs" />
                            <select name="paymentMode" defaultValue={row.paymentMode} className="rounded border border-slate-300 px-2 py-1 text-xs">
                              <option value="cash">Cash</option>
                              <option value="bank">Bank</option>
                              <option value="cheque">Cheque</option>
                            </select>
                            <button className="col-span-2 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white">Update Collection</button>
                          </PinProtectedForm>
                        )}
                        {row.receiptDate && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            {row.receiptNo || "Receipt"} · {fmtDate(row.receiptDate)}
                          </p>
                        )}
                      </Td>
                      <Td>
                        <PinProtectedForm action={deleteShopCollection}>
                          <input type="hidden" name="id" value={row.id} />
                          <button className="text-xs font-semibold text-red-600">Delete</button>
                        </PinProtectedForm>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Shop / Property Master">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>No. / Location</Th>
                  <Th>Type</Th>
                  <Th>Occupant</Th>
                  <Th>Agreement</Th>
                  <Th right>Monthly Rent</Th>
                  <Th right>Premium</Th>
                  <Th>Status</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {shopRows.length === 0 && <EmptyRow colSpan={8} message="No shops or properties registered yet." />}
                {shopRows.map((shop) => (
                  <tr key={shop.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-semibold">{shop.shopNumber}</span>
                      <br /><span className="text-xs text-slate-500">{shop.block || "-"}</span>
                    </Td>
                    <Td className="capitalize">{shop.propertyType}</Td>
                    <Td>{shop.occupantName}<br /><span className="text-xs text-slate-500">{shop.mobile || "-"}</span></Td>
                    <Td>{fmtDate(shop.agreementStart)} — {fmtDate(shop.agreementEnd)}</Td>
                    <Td right>{inr(shop.monthlyRent)}</Td>
                    <Td right>{inr(shop.premiumTotal)}</Td>
                    <Td>
                      <PinProtectedForm action={updateShopStatus} className="flex gap-1">
                        <input type="hidden" name="id" value={shop.id} />
                        <select name="status" defaultValue={shop.status} className="rounded border border-slate-300 px-2 py-1 text-xs">
                          <option value="active">active</option>
                          <option value="vacant">vacant</option>
                          <option value="closed">closed</option>
                        </select>
                        <button className="rounded bg-slate-800 px-2 py-1 text-xs text-white">Set</button>
                      </PinProtectedForm>
                    </Td>
                    <Td>
                      <PinProtectedForm action={deleteShop}>
                        <input type="hidden" name="id" value={shop.id} />
                        <button className="text-xs font-semibold text-red-600">Delete</button>
                      </PinProtectedForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

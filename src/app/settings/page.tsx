import Image from "next/image";
import { db } from "@/db";
import {
  apmcProfile,
  cashbookOpeningBalances,
  parties,
  ledgerHeads,
} from "@/db/schema";
import { asc } from "drizzle-orm";
import Link from "next/link";
import {
  saveApmcProfile,
  addParty,
  togglePartyStatus,
  deleteParty,
  addLedgerHead,
  changeSecurityPin,
  setupInitialCashbookOpeningBalance,
} from "@/lib/actions";
import HindiField from "@/components/HindiField";
import DeleteHeadButton from "@/components/DeleteHeadButton";
import PinProtectedForm from "@/components/PinProtectedForm";
import DataManagementPanel from "@/components/DataManagementPanel";
import { currentFY, fmtDate, inr } from "@/lib/format";
import {
  PageHeader, Card, StatCard, Th, Td, Badge, EmptyRow, inputCls, labelCls, btnCls,
} from "@/components/ui";

export const dynamic = "force-dynamic";

const partyColor = (t: string) =>
  t === "trader" ? "blue" : t === "arhatiya" ? "amber" : t === "contractor" ? "red" : t === "vendor" ? "green" : "slate";

const headColor = (t: string) =>
  t === "income" ? "green" : t === "expense" ? "red" : t === "asset" ? "blue" : "amber";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    headDelete?: string;
    pinChanged?: string;
    openingSetup?: string;
  }>;
}) {
  const { headDelete, pinChanged, openingSetup } = await searchParams;
  const [profiles, partyRows, heads, openingRows] = await Promise.all([
    db.select().from(apmcProfile).limit(1),
    db.select().from(parties).orderBy(asc(parties.name)),
    db.select().from(ledgerHeads).orderBy(asc(ledgerHeads.type), asc(ledgerHeads.code)),
    db
      .select()
      .from(cashbookOpeningBalances)
      .orderBy(asc(cashbookOpeningBalances.id))
      .limit(1),
  ]);
  const profile = profiles[0];
  const initialOpening = openingRows[0];
  const setupFinancialYear = currentFY();
  const setupStartYear = Number(setupFinancialYear.slice(0, 4));
  const setupPeriodStart = `${setupStartYear}-04-01`;
  const setupPeriodEnd = `${setupStartYear + 1}-03-31`;

  return (
    <div>
      <PageHeader
        title="APMC Profile & Settings"
        hindi="प्रोफ़ाइल एवं सेटिंग्स"
        subtitle="Mandi Samiti profile, party directory and income / expense head master"
      />

      {headDelete === "success" && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          ✓ Head and all of its linked records were deleted successfully.
        </div>
      )}
      {headDelete === "failed" && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          Head deletion failed. Please refresh the page and try again.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Registered Parties" value={String(partyRows.length)} icon="🏪" accent="blue" />
        <StatCard label="Income Heads" value={String(heads.filter((h) => h.type === "income").length)} icon="📈" accent="emerald" />
        <StatCard label="Expense Heads" value={String(heads.filter((h) => h.type === "expense").length)} icon="📉" accent="red" />
      </div>

      <div id="initial-opening-balance" className="mt-6 scroll-mt-6">
        <Card title="Initial Opening Balance Setup / प्रारम्भिक शेष की पहली सेटिंग">
          {openingSetup === "success" && (
            <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              ✓ Initial Opening Balance successfully saved and permanently locked.
            </p>
          )}
          {openingSetup === "locked" && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
              Opening Balance पहले ही set है। इसे दोबारा edit या save नहीं किया जा सकता।
            </p>
          )}
          {(openingSetup === "invalid" ||
            openingSetup === "invalid-date") && (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              Opening setup details valid नहीं हैं। Date selected Financial Year के अंदर होनी चाहिए।
            </p>
          )}

          {initialOpening ? (
            <div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Financial Year
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {initialOpening.financialYear}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Opening Date
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-900">
                    {fmtDate(initialOpening.openingDate)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Opening Cash
                  </p>
                  <p className="mt-1 text-lg font-bold text-emerald-900">
                    {inr(initialOpening.openingCash)}
                  </p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                    Opening Bank
                  </p>
                  <p className="mt-1 text-lg font-bold text-blue-900">
                    {inr(initialOpening.openingBank)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 font-bold text-slate-800">🔒 Setup Locked</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <span>
                  Remarks: {initialOpening.remarks || "Opening Balance b/f"}
                </span>
                <span className="text-xs">
                  Operational Data Reset के बाद ही नया initial setup उपलब्ध होगा।
                </span>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                यह option केवल software पर accounting work शुरू करने से पहले एक बार उपलब्ध है। Save के बाद values edit नहीं होंगी।
              </div>
              <PinProtectedForm
                action={setupInitialCashbookOpeningBalance}
                purpose="Initial Opening Balance setup"
                className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 xl:grid-cols-5"
              >
                <input
                  type="hidden"
                  name="financialYear"
                  value={setupFinancialYear}
                />
                <div>
                  <label className={labelCls}>Financial Year</label>
                  <div className="rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                    {setupFinancialYear}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Opening Date / प्रारम्भिक दिनांक</label>
                  <input
                    type="date"
                    name="openingDate"
                    min={setupPeriodStart}
                    max={setupPeriodEnd}
                    defaultValue={setupPeriodStart}
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Opening Cash / प्रारम्भिक रोकड़ (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="openingCash"
                    defaultValue="0.00"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Combined Opening Bank (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="openingBank"
                    defaultValue="0.00"
                    required
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Remarks / टिप्पणी</label>
                  <input
                    name="remarks"
                    placeholder="Opening Balance b/f"
                    className={inputCls}
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-5">
                  <button className={btnCls + " w-full"}>
                    Save & Lock Initial Opening Balance
                  </button>
                </div>
              </PinProtectedForm>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Security PIN / सुरक्षा पिन">
          {pinChanged === "success" && (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              ✓ Security PIN successfully changed.
            </p>
          )}
          {pinChanged === "invalid" && (
            <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
              Current PIN is incorrect.
            </p>
          )}
          {pinChanged === "mismatch" && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
              New PIN must be 4–8 digits and both entries must match.
            </p>
          )}
          <form action={changeSecurityPin} className="space-y-3">
            <div>
              <label className={labelCls}>Current PIN</label>
              <input type="password" inputMode="numeric" name="currentPin" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>New PIN (4–8 digits)</label>
              <input type="password" inputMode="numeric" pattern="[0-9]{4,8}" name="newPin" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Confirm New PIN</label>
              <input type="password" inputMode="numeric" pattern="[0-9]{4,8}" name="confirmPin" required className={inputCls} />
            </div>
            <button className={btnCls + " w-full"}>Change Security PIN</button>
          </form>
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Fresh installation default PIN: <strong>1234</strong>. इसे official use से पहले बदलें।
          </p>
        </Card>

        <Card title="Data Backup & Reset / डाटा बैकअप एवं रीसेट" className="xl:col-span-2">
          <DataManagementPanel />
        </Card>
      </div>

      {/* ---------- APMC Profile ---------- */}
      <div className="mt-6">
        <Card title="APMC / Mandi Samiti Profile — used on voucher letterheads">
          <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-white p-1.5 shadow-sm ring-2 ring-emerald-200">
              <Image
                src="/images/apmc-seal.svg"
                alt="Uttar Pradesh Mandi Parishad seal"
                width={72}
                height={72}
                priority
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Official profile preview
              </p>
              <p className="mt-1 text-lg font-bold text-slate-900">
                {profile?.mandiName ?? "Agriculture Produce Market Committee"}
              </p>
              <p className="text-sm font-medium text-emerald-800">
                {profile?.mandiNameHindi ?? "राज्य कृषि उत्पादन मण्डी परिषद्, उत्तर प्रदेश"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {[profile?.address, profile?.district, profile?.state]
                  .filter(Boolean)
                  .join(", ") || "Uttar Pradesh"}
              </p>
            </div>
          </div>
          <PinProtectedForm
            action={saveApmcProfile}
            purpose="APMC Profile update"
            className="grid grid-cols-1 gap-4 md:grid-cols-3"
          >
            <div>
              <label className={labelCls}>Mandi Name (English) *</label>
              <input name="mandiName" defaultValue={profile?.mandiName ?? ""} placeholder="Krishi Utpadan Mandi Samiti, Lucknow" required className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Mandi Name (हिन्दी)</label>
              <input name="mandiNameHindi" defaultValue={profile?.mandiNameHindi ?? ""} placeholder="कृषि उत्पादन मण्डी समिति, लखनऊ" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>GSTIN</label>
              <input name="gstin" defaultValue={profile?.gstin ?? ""} placeholder="09AAAAA0000A1Z5" className={inputCls} />
            </div>
            <div className="md:col-span-2">
              <label className={labelCls}>Address</label>
              <input name="address" defaultValue={profile?.address ?? ""} placeholder="Naveen Mandi Sthal, Sitapur Road" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>District</label>
              <input name="district" defaultValue={profile?.district ?? ""} placeholder="Lucknow" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input name="state" defaultValue={profile?.state ?? "Uttar Pradesh"} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>PIN Code</label>
              <input name="pincode" defaultValue={profile?.pincode ?? ""} placeholder="226021" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input name="phone" defaultValue={profile?.phone ?? ""} placeholder="0522-2735544" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" name="email" defaultValue={profile?.email ?? ""} placeholder="mandi.lko@up.gov.in" className={inputCls} />
            </div>
            <div className="flex items-end">
              <button className={btnCls + " w-full"}>💾 Save Profile</button>
            </div>
          </PinProtectedForm>
        </Card>
      </div>

      {/* ---------- Party Directory ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Add Party / पार्टी जोड़ें">
          <form action={addParty} className="space-y-3">
            <HindiField
              label="Party Name (English) *"
              hindiLabel="पार्टी नाम (हिन्दी) — स्वतः"
              placeholder="M/s Gupta Traders"
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Type</label>
                <select name="partyType" className={inputCls}>
                  <option value="trader">Trader (व्यापारी)</option>
                  <option value="arhatiya">Arhatiya (आढ़तिया)</option>
                  <option value="vendor">Vendor / Supplier</option>
                  <option value="contractor">Contractor (ठेकेदार)</option>
                  <option value="farmer">Farmer (किसान)</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>License No.</label>
                <input name="licenseNo" placeholder="LIC-2024-001" className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Contact Person</label>
                <input name="contactPerson" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input name="phone" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" name="email" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Address</label>
              <input name="address" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>GSTIN</label>
              <input name="gstin" className={inputCls} />
            </div>
            <button className={btnCls + " w-full"}>Add Party</button>
          </form>
        </Card>

        <Card title={`Party Directory (${partyRows.length})`} className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Party</Th>
                  <Th>Type</Th>
                  <Th>License</Th>
                  <Th>Contact</Th>
                  <Th>GSTIN</Th>
                  <Th>Status</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {partyRows.length === 0 && (
                  <EmptyRow colSpan={7} message="No parties registered yet. Add traders, vendors & contractors here." />
                )}
                {partyRows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <Td>
                      <span className="font-semibold">{p.name}</span>
                      {p.nameHindi && (
                        <>
                          <br />
                          <span className="text-xs text-emerald-700">{p.nameHindi}</span>
                        </>
                      )}
                      {p.address && (
                        <>
                          <br />
                          <span className="text-xs text-slate-500">{p.address}</span>
                        </>
                      )}
                    </Td>
                    <Td><Badge color={partyColor(p.partyType)}>{p.partyType}</Badge></Td>
                    <Td>{p.licenseNo ?? "-"}</Td>
                    <Td>
                      {p.contactPerson ?? "-"}
                      {p.phone && (
                        <>
                          <br />
                          <span className="text-xs text-slate-500">📞 {p.phone}</span>
                        </>
                      )}
                    </Td>
                    <Td className="text-xs">{p.gstin ?? "-"}</Td>
                    <Td>
                      <PinProtectedForm
                        action={togglePartyStatus}
                        purpose="Party status update"
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value={p.status} />
                        <button title="Toggle status">
                          <Badge color={p.status === "active" ? "green" : "slate"}>{p.status}</Badge>
                        </button>
                      </PinProtectedForm>
                    </Td>
                    <Td>
                      <PinProtectedForm
                        action={deleteParty}
                        purpose="Party delete"
                        confirmMessage={`Delete ${p.name}? This cannot be undone.`}
                      >
                        <input type="hidden" name="id" value={p.id} />
                        <button className="text-xs font-semibold text-red-500 hover:text-red-700" title="Delete party">
                          ✕
                        </button>
                      </PinProtectedForm>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* ---------- Income / Expense Head Master ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Add Income / Expense Head">
          <form action={addLedgerHead} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Code</label>
                <input name="code" placeholder="INC-08" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select name="type" defaultValue="income" className={inputCls}>
                  <option value="income">Income (आय)</option>
                  <option value="expense">Expense (व्यय)</option>
                  <option value="asset">Asset</option>
                  <option value="liability">Liability</option>
                </select>
              </div>
            </div>
            <HindiField
              label="Head Name (English) *"
              hindiLabel="शीर्ष नाम (हिन्दी) — स्वतः"
              placeholder="e.g. Parking Fee"
              required
            />
            <button className={btnCls + " w-full"}>Add New Head</button>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Existing Income/Expense Heads locked हैं और edit नहीं किए जा सकते। Operational Data Reset में Head Master सुरक्षित रहता है।
            </div>
            <p className="text-xs text-amber-700">
              Warning: manual delete करने पर linked Cashbook entries, bills और budgets भी delete होंगे।
            </p>
          </form>
        </Card>

        <Card title={`Income & Expense Head Master (${heads.length})`} className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <Th>Code</Th>
                  <Th>Head Name</Th>
                  <Th>हिन्दी नाम</Th>
                  <Th>Type</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {heads.length === 0 && <EmptyRow colSpan={5} message="No heads defined yet." />}
                {heads.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <Td className="font-mono text-xs">{h.code}</Td>
                    <Td className="font-semibold">{h.name}</Td>
                    <Td className="text-emerald-700">{h.nameHindi ?? "-"}</Td>
                    <Td><Badge color={headColor(h.type)}>{h.type}</Badge></Td>
                    <Td>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
                          🔒 Edit Locked
                        </span>
                        <DeleteHeadButton id={h.id} name={`${h.code} — ${h.name}`} />
                      </div>
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

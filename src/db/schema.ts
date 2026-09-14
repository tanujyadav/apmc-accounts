import {
  pgTable,
  serial,
  text,
  numeric,
  date,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

// Application security settings. Only a one-way PIN hash is stored.
export const appSecuritySettings = pgTable("app_security_settings", {
  id: serial("id").primaryKey(),
  pinHash: text("pin_hash").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// APMC / Mandi Samiti profile (single-row settings)
export const apmcProfile = pgTable("apmc_profile", {
  id: serial("id").primaryKey(),
  mandiName: text("mandi_name").notNull(),
  mandiNameHindi: text("mandi_name_hindi"),
  address: text("address"),
  district: text("district"),
  state: text("state").notNull().default("Uttar Pradesh"),
  pincode: text("pincode"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Party directory — traders, arhatiyas, vendors, contractors, farmers
export const parties = pgTable("parties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  partyType: text("party_type").notNull().default("trader"), // trader | arhatiya | vendor | contractor | farmer | other
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  gstin: text("gstin"),
  licenseNo: text("license_no"),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chart of accounts / ledger heads
export const ledgerHeads = pgTable("ledger_heads", {
  id: serial("id").primaryKey(),
  code: text("code").notNull(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  type: text("type").notNull(), // income | expense | asset | liability
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bank accounts of the Mandi Samiti
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  bankName: text("bank_name").notNull(),
  branch: text("branch").notNull(),
  accountNumber: text("account_number").notNull(),
  ifscCode: text("ifsc_code").notNull(),
  accountType: text("account_type").notNull(), // Savings | Current | FD
  openingBalance: numeric("opening_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  openingBalanceDate: date("opening_balance_date"),
  status: text("status").notNull().default("active"), // active | closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cashbook (day book) entries — receipts & payments
export const cashbookEntries = pgTable("cashbook_entries", {
  id: serial("id").primaryKey(),
  entryDate: date("entry_date").notNull(),
  voucherNo: text("voucher_no").notNull(),
  entryType: text("entry_type").notNull(), // receipt | payment
  mode: text("mode").notNull(), // cash | bank | cheque
  ledgerHeadId: integer("ledger_head_id")
    .notNull()
    .references(() => ledgerHeads.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  chequeNo: text("cheque_no"),
  partyName: text("party_name"),
  particulars: text("particulars").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  reconciled: boolean("reconciled").notNull().default(false),
  reconciledDate: date("reconciled_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial-year opening balances shown in the Cashbook register
export const cashbookOpeningBalances = pgTable("cashbook_opening_balances", {
  id: serial("id").primaryKey(),
  financialYear: text("financial_year").notNull(),
  openingDate: date("opening_date"),
  openingCash: numeric("opening_cash", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  openingBank: numeric("opening_bank", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cheque register — issued & received cheques
export const cheques = pgTable("cheques", {
  id: serial("id").primaryKey(),
  chequeNo: text("cheque_no").notNull(),
  chequeDate: date("cheque_date").notNull(),
  bankAccountId: integer("bank_account_id")
    .notNull()
    .references(() => bankAccounts.id),
  partyName: text("party_name").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  direction: text("direction").notNull(), // issued | received
  status: text("status").notNull().default("pending"), // pending | cleared | bounced | cancelled
  clearedDate: date("cleared_date"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Month-wise Bank Reconciliation Statement manual adjustments
export const brsStatements = pgTable("brs_statements", {
  id: serial("id").primaryKey(),
  // Null means the statutory BRS covers all APMC bank accounts together.
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id, {
    onDelete: "cascade",
  }),
  statementMonth: text("statement_month").notNull(), // YYYY-MM
  bankInterest: numeric("bank_interest", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  indirectDeposits: numeric("indirect_deposits", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  otherReceipts: numeric("other_receipts", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  bankCharges: numeric("bank_charges", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  otherExpenses: numeric("other_expenses", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  passbookBalance: numeric("passbook_balance", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  cashbookBalanceSnapshot: numeric("cashbook_balance_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  unpresentedChequesSnapshot: numeric("unpresented_cheques_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  unpresentedCountSnapshot: integer("unpresented_count_snapshot").notNull().default(0),
  unclearedDepositsSnapshot: numeric("uncleared_deposits_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  unclearedCountSnapshot: integer("uncleared_count_snapshot").notNull().default(0),
  totalAdditionsSnapshot: numeric("total_additions_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  balanceAfterAdditionsSnapshot: numeric("balance_after_additions_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  totalDeductionsSnapshot: numeric("total_deductions_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  calculatedBalanceSnapshot: numeric("calculated_balance_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  differenceSnapshot: numeric("difference_snapshot", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  remarks: text("remarks"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cash deposit slips (cash deposited into bank)
export const cashDeposits = pgTable("cash_deposits", {
  id: serial("id").primaryKey(),
  depositDate: date("deposit_date").notNull(),
  bankAccountId: integer("bank_account_id")
    .notNull()
    .references(() => bankAccounts.id),
  slipNo: text("slip_no").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  depositedBy: text("deposited_by").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Allocation of each bank cash deposit against Cashbook cash receipts.
// A receipt can be deposited in full or in multiple partial deposits.
export const cashDepositAllocations = pgTable("cash_deposit_allocations", {
  id: serial("id").primaryKey(),
  cashDepositId: integer("cash_deposit_id")
    .notNull()
    .references(() => cashDeposits.id, { onDelete: "cascade" }),
  cashbookEntryId: integer("cashbook_entry_id").references(
    () => cashbookEntries.id,
    { onDelete: "cascade" },
  ),
  cashbookOpeningBalanceId: integer("cashbook_opening_balance_id").references(
    () => cashbookOpeningBalances.id,
    { onDelete: "cascade" },
  ),
  allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Budget allocation per ledger head per financial year
export const budgets = pgTable("budgets", {
  id: serial("id").primaryKey(),
  financialYear: text("financial_year").notNull(), // e.g. 2025-26
  ledgerHeadId: integer("ledger_head_id")
    .notNull()
    .references(() => ledgerHeads.id),
  allocatedAmount: numeric("allocated_amount", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Bills raised against budget heads
export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  billNo: text("bill_no").notNull(),
  billDate: date("bill_date").notNull(),
  vendorName: text("vendor_name").notNull(),
  description: text("description").notNull(),
  ledgerHeadId: integer("ledger_head_id")
    .notNull()
    .references(() => ledgerHeads.id),
  financialYear: text("financial_year").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | paid | rejected
  paymentDate: date("payment_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Mandi shops / godowns / canteens allotted to occupants
export const shops = pgTable("shops", {
  id: serial("id").primaryKey(),
  shopNumber: text("shop_number").notNull(),
  block: text("block"),
  propertyType: text("property_type").notNull().default("shop"), // shop | godown | canteen | other
  occupantName: text("occupant_name").notNull(),
  mobile: text("mobile"),
  agreementStart: date("agreement_start"),
  agreementEnd: date("agreement_end"),
  monthlyRent: numeric("monthly_rent", { precision: 14, scale: 2 }).notNull().default("0"),
  premiumTotal: numeric("premium_total", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"), // active | vacant | closed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Monthly shop rent / premium demand and collection register
export const shopCollections = pgTable("shop_collections", {
  id: serial("id").primaryKey(),
  shopId: integer("shop_id").notNull().references(() => shops.id),
  demandMonth: text("demand_month").notNull(), // YYYY-MM
  receiptDate: date("receipt_date"),
  receiptNo: text("receipt_no"),
  rentAmount: numeric("rent_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  premiumAmount: numeric("premium_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  penaltyAmount: numeric("penalty_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  amountPaid: numeric("amount_paid", { precision: 14, scale: 2 }).notNull().default("0"),
  paymentMode: text("payment_mode").notNull().default("cash"), // cash | bank | cheque
  status: text("status").notNull().default("pending"), // pending | partial | paid
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// APMC employee master
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  employeeCode: text("employee_code").notNull(),
  name: text("name").notNull(),
  nameHindi: text("name_hindi"),
  designation: text("designation").notNull(),
  employmentType: text("employment_type").notNull().default("regular"), // regular | contract | outsourced
  pan: text("pan"),
  bankAccount: text("bank_account"),
  basicPay: numeric("basic_pay", { precision: 14, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("active"), // active | inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Salary, arrear, allowance, advance and other staff payments
export const staffPayments = pgTable("staff_payments", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffMembers.id),
  paymentMonth: text("payment_month").notNull(), // YYYY-MM
  paymentDate: date("payment_date"),
  paymentType: text("payment_type").notNull().default("salary"), // salary | allowance | arrear | advance | reimbursement | other
  basicAmount: numeric("basic_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  allowanceAmount: numeric("allowance_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  deductionAmount: numeric("deduction_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  tdsAmount: numeric("tds_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  netAmount: numeric("net_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  voucherNo: text("voucher_no"),
  status: text("status").notNull().default("pending"), // pending | paid
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Quarterly TDS return and challan filing register
export const tdsReturns = pgTable("tds_returns", {
  id: serial("id").primaryKey(),
  financialYear: text("financial_year").notNull(),
  quarter: text("quarter").notNull(), // Q1 | Q2 | Q3 | Q4
  formType: text("form_type").notNull().default("24Q"), // 24Q | 26Q | 27Q | other
  section: text("section").notNull(),
  challanNo: text("challan_no"),
  bsrCode: text("bsr_code"),
  depositDate: date("deposit_date"),
  taxableAmount: numeric("taxable_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  tdsAmount: numeric("tds_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  interestLateFee: numeric("interest_late_fee", { precision: 14, scale: 2 }).notNull().default("0"),
  filingDate: date("filing_date"),
  acknowledgementNo: text("acknowledgement_no"),
  status: text("status").notNull().default("pending"), // pending | deposited | filed | revised
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Financial-year revenue target per income ledger head
export const revenueTargets = pgTable("revenue_targets", {
  id: serial("id").primaryKey(),
  financialYear: text("financial_year").notNull(),
  ledgerHeadId: integer("ledger_head_id").notNull().references(() => ledgerHeads.id),
  targetAmount: numeric("target_amount", { precision: 14, scale: 2 }).notNull().default("0"),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

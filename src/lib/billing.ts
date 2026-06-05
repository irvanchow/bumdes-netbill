import { db } from "@/lib/db";
import { bills, customers, internetPackages } from "@/lib/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateInvoiceNumber, generateInstallationInvoiceNumber, toLocalDateStr } from "@/lib/utils";

const INSTALLATION_FEE = 500000;

export async function generateMonthlyBills(period: Date) {
  const billPeriod = new Date(period.getFullYear(), period.getMonth(), 1);
  const billPeriodStr = toLocalDateStr(billPeriod);

  // Only bill customers activated before this billing month.
  // (Customers activated during this month get their first bill via generateFirstBill.)
  const cutoffStr = billPeriodStr;

  const eligibleCustomers = await db
    .select({
      id: customers.id,
      packageId: customers.packageId,
      monthlyPrice: internetPackages.monthlyPrice,
      activationDate: customers.activationDate,
    })
    .from(customers)
    .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(
      and(
        inArray(customers.status, ["aktif", "suspend"]),
        sql`${customers.activationDate} IS NOT NULL`,
        sql`${customers.activationDate} <= ${cutoffStr}`
      )
    );

  let generated = 0;
  let skipped = 0;

  for (const customer of eligibleCustomers) {
    const existing = await db
      .select({ id: bills.id })
      .from(bills)
      .where(
        and(
          eq(bills.customerId, customer.id),
          eq(bills.billPeriod, billPeriodStr)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // dueDate = activation day in this billing month
    const actDay = customer.activationDate
      ? Number(customer.activationDate.split("-")[2])
      : 1;
    const dueDate = new Date(billPeriod.getFullYear(), billPeriod.getMonth(), actDay);
    const dueDateStr = toLocalDateStr(dueDate);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bills)
      .where(eq(bills.billPeriod, billPeriodStr));

    const sequence = (countResult?.count ?? 0) + 1;
    const invoiceNumber = generateInvoiceNumber(billPeriod, sequence);

    await db.insert(bills).values({
      customerId: customer.id,
      billPeriod: billPeriodStr,
      amount: customer.monthlyPrice,
      status: "belum_bayar",
      dueDate: dueDateStr,
      invoiceNumber,
    });

    generated++;
  }

  return { generated, skipped, total: eligibleCustomers.length };
}

export async function generateFirstBill(customerId: string, activationDate: Date) {
  // dueDate = activationDate + 1 month (same day number)
  // e.g. 01 Mei → 01 Juni, 25 Mei → 25 Juni
  const dueDate = new Date(activationDate.getFullYear(), activationDate.getMonth() + 1, activationDate.getDate());
  const dueDateStr = toLocalDateStr(dueDate);
  // billPeriod = 1st of dueDate's month
  const billPeriod = new Date(dueDate.getFullYear(), dueDate.getMonth(), 1);
  const billPeriodStr = toLocalDateStr(billPeriod);

  // Check if bill already exists
  const existing = await db
    .select({ id: bills.id })
    .from(bills)
    .where(
      and(
        eq(bills.customerId, customerId),
        eq(bills.billPeriod, billPeriodStr)
      )
    )
    .limit(1);

  if (existing.length > 0) return null;

  // Get customer's package price
  const [customer] = await db
    .select({ monthlyPrice: internetPackages.monthlyPrice })
    .from(customers)
    .innerJoin(internetPackages, eq(customers.packageId, internetPackages.id))
    .where(eq(customers.id, customerId))
    .limit(1);

  if (!customer) return null;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bills)
    .where(eq(bills.billPeriod, billPeriodStr));

  const sequence = (countResult?.count ?? 0) + 1;
  const invoiceNumber = generateInvoiceNumber(billPeriod, sequence);

  const [bill] = await db.insert(bills).values({
    customerId,
    billPeriod: billPeriodStr,
    amount: customer.monthlyPrice,
    status: "belum_bayar",
    dueDate: dueDateStr,
    invoiceNumber,
  }).returning();

  return bill;
}

export async function generateInstallationBill(customerId: string) {
  const now = new Date();
  // Use registration date (today) as billPeriod to avoid conflict with monthly bills
  const billPeriodStr = toLocalDateStr(now);
  const dueDate = new Date(now.getFullYear(), now.getMonth(), 27);
  const dueDateStr = toLocalDateStr(dueDate);

  // Count existing installation invoices for sequence
  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bills)
    .where(eq(bills.billType, "instalasi"));

  const sequence = (countResult?.count ?? 0) + 1;
  const invoiceNumber = generateInstallationInvoiceNumber(now, sequence);

  const [bill] = await db.insert(bills).values({
    customerId,
    billPeriod: billPeriodStr,
    amount: INSTALLATION_FEE,
    status: "belum_bayar",
    billType: "instalasi",
    dueDate: dueDateStr,
    invoiceNumber,
  }).returning();

  return bill;
}

export async function updateCustomerStatuses() {
  const results = await db
    .select({
      id: customers.id,
      currentStatus: customers.status,
      unpaidCount: sql<number>`count(${bills.id})::int`,
    })
    .from(customers)
    .leftJoin(
      bills,
      and(
        eq(bills.customerId, customers.id),
        eq(bills.status, "belum_bayar")
      )
    )
    .where(sql`${customers.activationDate} IS NOT NULL`)
    .groupBy(customers.id, customers.status);

  let toAktif = 0;
  let toSuspend = 0;
  let toNonaktif = 0;

  for (const row of results) {
    let newStatus: "aktif" | "suspend" | "nonaktif";

    if (row.unpaidCount === 0) {
      newStatus = "aktif";
    } else if (row.unpaidCount === 1) {
      newStatus = "suspend";
    } else {
      newStatus = "nonaktif";
    }

    if (newStatus !== row.currentStatus) {
      await db
        .update(customers)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(customers.id, row.id));

      if (newStatus === "aktif") toAktif++;
      else if (newStatus === "suspend") toSuspend++;
      else toNonaktif++;
    }
  }

  return { toAktif, toSuspend, toNonaktif };
}

export async function updateCustomerStatusAfterPayment(customerId: string, billId: string) {
  // Check if the paid bill is an installation bill
  const [paidBill] = await db
    .select({ billType: bills.billType })
    .from(bills)
    .where(eq(bills.id, billId))
    .limit(1);

  // Get current customer status
  const [customer] = await db
    .select({ status: customers.status, activationDate: customers.activationDate })
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);

  // If installation bill paid and customer is "belum_aktif", set to "aktif"
  if (paidBill?.billType === "instalasi" && customer?.status === "belum_aktif") {
    await db
      .update(customers)
      .set({ status: "aktif", updatedAt: new Date() })
      .where(eq(customers.id, customerId));

    // Prepaid: create the first monthly bill now, with a due date derived from
    // the activation date. activationDate is a DB "date" string (YYYY-MM-DD);
    // parse its parts manually and build a local Date — never new Date(string),
    // which parses as UTC and can shift the day on the WITA (UTC+8) server.
    if (customer.activationDate) {
      const [yy, mm, dd] = customer.activationDate.split("-").map(Number);
      if (!Number.isNaN(yy) && !Number.isNaN(mm) && !Number.isNaN(dd)) {
        await generateFirstBill(customerId, new Date(yy, mm - 1, dd));
      }
    }

    return "aktif";
  }

  // For monthly bills, count remaining unpaid monthly bills
  const [result] = await db
    .select({ unpaidCount: sql<number>`count(*)::int` })
    .from(bills)
    .where(
      and(
        eq(bills.customerId, customerId),
        eq(bills.status, "belum_bayar"),
        eq(bills.billType, "bulanan")
      )
    );

  let newStatus: "belum_aktif" | "aktif" | "suspend" | "nonaktif";
  const unpaidCount = result?.unpaidCount ?? 0;

  if (customer?.status === "belum_aktif") {
    newStatus = "belum_aktif";
  } else if (unpaidCount === 0) {
    newStatus = "aktif";
  } else if (unpaidCount === 1) {
    newStatus = "suspend";
  } else {
    newStatus = "nonaktif";
  }

  await db
    .update(customers)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(customers.id, customerId));

  return newStatus;
}

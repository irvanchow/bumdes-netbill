import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "collector"]);
export const customerStatusEnum = pgEnum("customer_status", ["aktif", "nonaktif"]);
export const billStatusEnum = pgEnum("bill_status", ["belum_bayar", "lunas"]);
export const paymentMethodEnum = pgEnum("payment_method", ["tunai", "transfer"]);
export const packageCategoryEnum = pgEnum("package_category", ["wireless_broadband", "fiber_optik"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const internetPackages = pgTable("internet_packages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  category: packageCategoryEnum("category").notNull(),
  speed: varchar("speed", { length: 50 }).notNull(),
  monthlyPrice: integer("monthly_price").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 255 }),
  packageId: uuid("package_id")
    .references(() => internetPackages.id)
    .notNull(),
  registrationDate: date("registration_date").notNull(),
  activationDate: date("activation_date"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  status: customerStatusEnum("status").default("aktif").notNull(),
  assignedCollectorId: uuid("assigned_collector_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    customerId: uuid("customer_id")
      .references(() => customers.id)
      .notNull(),
    billPeriod: date("bill_period").notNull(),
    amount: integer("amount").notNull(),
    status: billStatusEnum("status").default("belum_bayar").notNull(),
    dueDate: date("due_date").notNull(),
    invoiceNumber: varchar("invoice_number", { length: 20 }).notNull().unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("bills_customer_period_idx").on(table.customerId, table.billPeriod),
  ]
);

export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  transactionCode: varchar("transaction_code", { length: 30 }).notNull().unique(),
  billId: uuid("bill_id")
    .references(() => bills.id)
    .notNull(),
  amountPaid: integer("amount_paid").notNull(),
  paymentDate: date("payment_date").notNull(),
  paymentTime: varchar("payment_time", { length: 8 }),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  collectorId: uuid("collector_id")
    .references(() => users.id)
    .notNull(),
  proofImageUrl: varchar("proof_image_url", { length: 500 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  appName: varchar("app_name", { length: 255 }).notNull(),
  bumdesAddress: text("bumdes_address").notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  invoiceFooterText: text("invoice_footer_text"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

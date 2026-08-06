const {
  pgTable,
  text,
  integer,
  doublePrecision,
  serial,
  jsonb,
  boolean,
  timestamp,
  uuid,
} = require("drizzle-orm/pg-core");
const { relations } = require("drizzle-orm");
const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  telegramId: text("telegram_id").unique().notNull(),
  userName: text("user_name").notNull().unique(),
  name: text("name").notNull(),
  rating: doublePrecision("rating").notNull().default(5.0),
  moneyCount: integer("money_count").default(0).notNull(),
  userItemsTotal: integer("user_items_total").default(0).notNull(),
  userItemsSelled: integer("user_items_selled").default(0).notNull(),
  userItemsBought: integer("user_items_bought").default(0).notNull(),
  selledTotal: integer("selled_total").default(0).notNull(),
  purchasedTotal: integer("purchased_total").default(0).notNull(),
  userRatingHistory: jsonb("user_rating_history")
  .notNull()
  .default([]),
  isBanned: boolean("is_banned").default(false).notNull(),
  bannedUntil: timestamp("banned_until", { withTimezone: true }),
  banReason: text("ban_reason"),
  role: text("role").notNull().default("user"),
  warnsCount: integer("warns_count").notNull().default(0),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

const item = pgTable("item", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  itemType: text("item_type").notNull().default("account"),
  status: text("status").notNull().default("checking"),
  itemDescription: text("item_description").notNull(),
  price: integer("price").notNull(),
  escrowPrice: integer("escrow_price"),
  rating: doublePrecision("rating").notNull().default(5.0),
  sellerId: text("seller_id")
    .notNull()
    .references(() => users.telegramId),
  buyerId: text("buyer_id").references(() => users.telegramId),
  payoutAt: timestamp("payout_at", { withTimezone: true }),
  sellerUserName: text("seller_user_name").notNull(),
  frozenUntil: timestamp("frozen_until", { withTimezone: true }),
  region: text("region"),
  starsCount: integer("stars_count"),
  durationMonths: integer("duration_months"),
  subscribers: integer("subscribers"),
  channelUrl: text("channel_url"),
  addDuration: integer("add_duration"),
  accountDetails: jsonb("account_details"),
});

const paymentMethod = pgTable("payment_method", {
  id: serial("id").primaryKey(),
  userId: text("userId").notNull(),
  numbers: text("cardNumber").notNull(),
  cvv: text("cardcvv").notNull(),
  mmyy: text("mmyy").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

const favouriteItem = pgTable("favourite_item", {
  id: serial("id").primaryKey(),
  userId: text("userid").notNull(),
  projectId: text("projectId").notNull(),
});

const message = pgTable("message", {
  id: serial("id").primaryKey(),
  to: text("to").notNull(),
  from: text("from").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  description: text("description").notNull(),
});

const account = pgTable("account", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  region: text("region").notNull(),
  sellerUserName: text("seller_user_name").notNull(),
  accountDetails: jsonb("account_details")
  .notNull()
  .default({}),
});

const add = pgTable("add", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  subscribers: integer("subscribers").notNull(),
  sellerUserName: text("seller_user_name").notNull(),
  addDuration: integer("days").notNull(),
  channelURL: text("channel_url").notNull(),
});

const telegramChanel = pgTable("telegramChanel", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  subscribers: integer("subscribers").notNull(),
  sellerUserName: text("seller_user_name").notNull(),
  channelURL: text("channel_url").notNull(),
});

const premium = pgTable("premium", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  durationMonths: integer("duration_months"),
});
const service = pgTable("service", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  serviceType: text("service_type").notNull(),       
  deliveryTimeHours: integer("delivery_time_hours"), 
  sellerUserName: text("seller_user_name").notNull(),
  requirements: text("requirements"),                 
  revisionsCount: integer("revisions_count").default(0),
  serviceDetails: jsonb("service_details").notNull().default({}),
});
const stars = pgTable("stars", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  starsCount: integer("stars_count").notNull().default(0),
});

const nftAndGift = pgTable("nft_and_gift", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  blockchainAddress: text("blockchain_address"),
  secretLinkOrCode: text("secret_link_or_code").notNull(),
  extraInfo: text("extra_info"),
});

const rate = pgTable("rate", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id),
  description: text("description").notNull(),
  rating: doublePrecision("rating").notNull(),
  raterId: text("rater_id")
    .notNull()
    .references(() => users.telegramId),
  ratedId: text("rated_id")
    .notNull()
    .references(() => users.telegramId),
});

const report = pgTable("report", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id")
    .notNull()
    .references(() => item.id),
  reporterId: text("reporter_id")
    .notNull()
    .references(() => users.telegramId),
  reportedId: text("reported_id")
    .notNull()
    .references(() => users.telegramId),
  description: text("description").notNull(),
  status: text("status").notNull().default("pending"),
});

const payment = pgTable("payment", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.telegramId),
  sellerId: text("seller_id").references(() => users.telegramId),
  itemId: integer("item_id").references(() => item.id),
  buyerConfirmed: boolean("buyer_confirmed").default(false),
  sellerConfirmed: boolean("seller_confirmed").default(false),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  buyerDeclineConfirmed: boolean("buyer_decline_confirmed").default(false),
  sellerDeclineConfirmed: boolean("seller_decline_confirmed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

const payout = pgTable("payout", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.telegramId),
  amount: integer("amount").notNull(),
  wallet: text("wallet").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

const messageRelations = relations(message, ({ one }) => ({
  author: one(users, {
    fields: [message.from],
    references: [users.telegramId],
  }),
}));

const userRelations = relations(users, ({ many }) => ({
  userItems: many(item, { relationName: "seller" }),
  purchasedItems: many(item, { relationName: "buyer" }),
  givenRates: many(rate, { relationName: "rater" }),
  receivedRates: many(rate, { relationName: "rated" }),
  sentReports: many(report, { relationName: "reporter" }),
  receivedReports: many(report, { relationName: "reported" }),
  payments: many(payment),
  payouts: many(payout),
  userMessages: many(message),
  paymentMethods: many(paymentMethod, {
    fields: [users.telegramId],
    references: [paymentMethod.userId],
  }),
}));

const itemRelations = relations(item, ({ one, many }) => ({
  seller: one(users, {
    fields: [item.sellerId],
    references: [users.telegramId],
    relationName: "seller",
  }),
  buyer: one(users, {
    fields: [item.buyerId],
    references: [users.telegramId],
    relationName: "buyer",
  }),
  accountDetails: one(account),
  premiumDetails: one(premium),
  nftAndGiftDetails: one(nftAndGift),
  serviceDetails: one(service),   // ← новое
  reports: many(report),
  rates: many(rate),
}));

const serviceRelations = relations(service, ({ one }) => ({
  item: one(item, { fields: [service.itemId], references: [item.id] }),
}));

const accountRelations = relations(account, ({ one }) => ({
  item: one(item, { fields: [account.itemId], references: [item.id] }),
}));

const addRelations = relations(add, ({ one }) => ({
  item: one(item, { fields: [add.itemId], references: [item.id] }),
}));

const tgChanelRelations = relations(telegramChanel, ({ one }) => ({
  item: one(item, { fields: [telegramChanel.itemId], references: [item.id] }),
}));

const premiumRelations = relations(premium, ({ one }) => ({
  item: one(item, { fields: [premium.itemId], references: [item.id] }),
}));

const paymentRelations = relations(payment, ({ one }) => ({
  user: one(users, {
    fields: [payment.userId],
    references: [users.telegramId],
  }),
  item: one(item, { fields: [payment.itemId], references: [item.id] }),
}));

const payoutRelations = relations(payout, ({ one }) => ({
  user: one(users, { fields: [payout.userId], references: [users.telegramId] }),
}));

const rateRelations = relations(rate, ({ one }) => ({
  item: one(item, { fields: [rate.itemId], references: [item.id] }),
  rater: one(users, {
    fields: [rate.raterId],
    references: [users.telegramId],
    relationName: "rater",
  }),
  rated: one(users, {
    fields: [rate.ratedId],
    references: [users.telegramId],
    relationName: "rated",
  }),
}));

const reportRelations = relations(report, ({ one }) => ({
  item: one(item, { fields: [report.itemId], references: [item.id] }),
  reporter: one(users, {
    fields: [report.reporterId],
    references: [users.telegramId],
    relationName: "reporter",
  }),
  reported: one(users, {
    fields: [report.reportedId],
    references: [users.telegramId],
    relationName: "reported",
  }),
}));

const nftAndGiftRelations = relations(nftAndGift, ({ one }) => ({
  item: one(item, { fields: [nftAndGift.itemId], references: [item.id] }),
}));
module.exports = {
  users,
  item,
  paymentMethod,
  favouriteItem,
  message,
  account,
  add,
  telegramChanel,
  premium,
  stars,
  nftAndGift,
  rate,
  report,
  payment,
  payout,

  userRelations,
  messageRelations,
  itemRelations,
  accountRelations,
  addRelations,
  tgChanelRelations,
  premiumRelations,
  paymentRelations,
  payoutRelations,
  rateRelations,
  reportRelations,
  nftAndGiftRelations,
  service,
  serviceRelations
};
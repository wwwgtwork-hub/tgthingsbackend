const { db } = require('../db');
const { eq } = require('drizzle-orm');
const { item, add, telegramChanel, account, premium, stars } = require('../src/db/schema');

const getItemsService = async () => {
  
  const items = await db
    .select()
    .from(item)
    .leftJoin(add, eq(item.id, add.itemId))
    .leftJoin(telegramChanel, eq(item.id, telegramChanel.itemId))
    .leftJoin(account, eq(item.id, account.itemId))
    .leftJoin(premium, eq(item.id, premium.itemId))
    .leftJoin(stars, eq(item.id, stars.itemId))
    .where(eq(item.status, "active"));

  return items.map(row => ({
    ...row.item,
    channelURL: row.add?.channelURL ?? row.telegramChanel?.channelURL ?? null,
    subscribers: row.add?.subscribers ?? row.telegramChanel?.subscribers ?? null,
    addDuration: row.add?.addDuration ?? null,
    region: row.account?.region ?? null,
    accountDetails: row.account?.accountDetails ?? null,
    durationMonths: row.premium?.durationMonths ?? null,
    starsCount: row.stars?.starsCount ?? null,
  }));
};

module.exports = { getItemsService };
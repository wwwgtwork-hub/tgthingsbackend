const { db } = require('../db');
const { item, account, premium, stars, add, telegramChanel, users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

const getItemService = async (itemId) => {
  if (!itemId) throw new Error('Item ID is required');

  const cleanId = Number(itemId);
  if (isNaN(cleanId)) return null;

  const [baseItem] = await db
    .select()
    .from(item)
    .where(eq(item.id, cleanId));

  if (!baseItem) return null;
  const [user] = await db.select().from(users).where(eq(users.telegramId, baseItem.sellerId))

  let extra = {};

  if (baseItem.itemType === 'account') {
    const [row] = await db.select().from(account).where(eq(account.itemId, cleanId));
    if (row) extra = { region: row.region, accountDetails: row.accountDetails };

  } else if (baseItem.itemType === 'premium') {
    const [row] = await db.select().from(premium).where(eq(premium.itemId, cleanId));
    if (row) extra = { durationMonths: row.durationMonths };

  } else if (baseItem.itemType === 'stars') {
    const [row] = await db.select().from(stars).where(eq(stars.itemId, cleanId));
    if (row) extra = { starsCount: row.starsCount };

  } else if (baseItem.itemType === 'telegramChanel') {
    const [row] = await db.select().from(telegramChanel).where(eq(telegramChanel.itemId, cleanId));
    if (row) extra = { subscribers: row.subscribers, channelUrl: row.channelURL };

  } else if (baseItem.itemType === 'add') {
    const [row] = await db.select().from(add).where(eq(add.itemId, cleanId));
    if (row) extra = { subscribers: row.subscribers, channelUrl: row.channelURL, addDuration: row.addDuration };
  }

  return {
    ...baseItem,
    ...extra,
    sellerName: user?.name,
    sellerTelegramId: user?.telegramId,
    selledTotal: user?.selledTotal,
    sellerRating: user?.rating,
    purchasedTotal: user?.purchasedTotal,
  };
};

module.exports = { getItemService };
const { db } = require('../db');
const { item, account, premium, stars, add, telegramChanel } = require('../src/db/schema');
const { eq } = require('drizzle-orm');


const ITEM_TYPE_HANDLERS = {
  account: (tx, itemId, data) =>
    tx.update(account)
      .set({
        region: data.region,
        accountDetails: data.accountDetails ?? {},
      })
      .where(eq(account.itemId, itemId)),

  premium: (tx, itemId, data) =>
    tx.update(premium)
      .set({ durationMonths: Number(data.durationMonths) })
      .where(eq(premium.itemId, itemId)),

  stars: (tx, itemId, data) =>
    tx.update(stars)
      .set({ starsCount: Number(data.starsCount) })
      .where(eq(stars.itemId, itemId)),

  telegramChanel: (tx, itemId, data) =>
    tx.update(telegramChanel)
      .set({
        channelURL: data.channelUrl,
        subscribers: Number(data.subscribers),
      })
      .where(eq(telegramChanel.itemId, itemId)),

  add: (tx, itemId, data) =>
    tx.update(add)
      .set({
        channelURL: data.channelUrl,
        subscribers: Number(data.subscribers),
        addDuration: Number(data.addDuration),
      })
      .where(eq(add.itemId, itemId)),
};

const updateItemService = async (itemId, itemData) => {
  const parsedItemId = Number(itemId);
  if (!itemId || !Number.isInteger(parsedItemId) || parsedItemId <= 0) {
    throw new Error('Item ID must be a positive integer');
  }

  const {
    name, itemDescription, price,
    region, accountDetails, durationMonths,
    starsCount, channelUrl, subscribers, addDuration,
  } = itemData;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Name is required');
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice < 0) {
    throw new Error('Price must be a non-negative number');
  }

  return await db.transaction(async (tx) => {
    const [updatedItem] = await tx
      .update(item)
      .set({
        name: name.trim(),
        itemDescription,
        price: parsedPrice,
      })
      .where(eq(item.id, parsedItemId))
      .returning();

    if (!updatedItem) {
      throw new Error(`Товар с ID ${parsedItemId} не найден`);
    }

    const handler = ITEM_TYPE_HANDLERS[updatedItem.itemType];
    if (!handler) {
      throw new Error(`Неизвестный тип товара: ${updatedItem.itemType}`);
    }

    await handler(tx, parsedItemId, {
      region, accountDetails, durationMonths,
      starsCount, channelUrl, subscribers, addDuration,
    });

    return updatedItem;
  });
};

module.exports = { updateItemService };
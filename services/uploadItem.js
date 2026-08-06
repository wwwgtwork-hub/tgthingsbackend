const { db } = require("../db");
const {
  item, account, premium, stars,
  add, telegramChanel, users,
} = require("../src/db/schema");
const { eq } = require("drizzle-orm");
const { checkBan } = require('./middlewares/checkBan');
const ITEM_TYPE_HANDLERS = {
  account: (tx, itemId, sellerUserName, data) => {
    const { region, accountDetails } = data;
    if (!region || !accountDetails)
      throw new Error("region and accountDetails are required for account");
    return tx.insert(account).values({
      itemId,
      region,
      sellerUserName,
      accountDetails,
    });
  },

  premium: (tx, itemId, _seller, data) => {
    const { durationMonths } = data;
    if (!durationMonths)
      throw new Error("durationMonths is required for premium");
    const parsed = Number(durationMonths);
    if (!Number.isInteger(parsed) || parsed <= 0)
      throw new Error("durationMonths must be a positive integer");
    return tx.insert(premium).values({ itemId, durationMonths: parsed });
  },

  stars: (tx, itemId, _seller, data) => {
    const { starsCount } = data;
    if (!starsCount)
      throw new Error("starsCount is required for stars");
    const parsed = Number(starsCount);
    if (!Number.isInteger(parsed) || parsed <= 0)
      throw new Error("starsCount must be a positive integer");
    return tx.insert(stars).values({ itemId, starsCount: parsed });
  },

  telegramChanel: (tx, itemId, sellerUserName, data) => {
    const { channelUrl, subscribers } = data;
    if (!channelUrl || !subscribers)
      throw new Error("channelUrl and subscribers are required for telegramChanel");
    return tx.insert(telegramChanel).values({
      itemId,
      channelURL: channelUrl,
      subscribers: Number(subscribers),
      sellerUserName,
    });
  },
  add: (tx, itemId, sellerUserName, data) => {
    const { channelUrl, subscribers, addDuration } = data;
    if (!channelUrl || !subscribers || !addDuration)
      throw new Error("channelUrl, subscribers and addDuration are required for add");
    return tx.insert(add).values({
      itemId,
      channelURL: channelUrl,
      subscribers: Number(subscribers),
      addDuration: Number(addDuration),
      sellerUserName,
    });
  },
};
const uploadItemService = async (itemData) => {
  const {
    name, itemDescription, price, itemType,
    sellerId, sellerUserName,
    region, accountDetails, durationMonths,
    starsCount, channelUrl, subscribers, addDuration,
  } = itemData;
  if (!name?.trim() || !itemDescription?.trim() || !sellerId || !sellerUserName) {
    throw new Error("name, itemDescription, sellerId and sellerUserName are required");
  }

  const parsedPrice = Number(price);
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    throw new Error("price must be a positive number");
  }

  const handler = ITEM_TYPE_HANDLERS[itemType];
  if (!handler) {
    throw new Error(`Invalid itemType: ${itemType}`);
  }
  return await db.transaction(async (tx) => {
    const [seller] = await tx
      .select({ rating: users.rating })
      .from(users)
      .where(eq(users.telegramId, sellerId));

    if (!seller) {
      throw new Error(`Seller with telegramId ${sellerId} not found`);
    }
    const checking = checkBan(sellerId);
    const [newItem] = await tx
      .insert(item)
      .values({
        name: name.trim(),
        itemDescription: itemDescription.trim(),
        price: parsedPrice,
        itemType,
        sellerId,
        sellerUserName,
        status: "checking",
        rating: Number(seller.rating) || 5,
        channelUrl: channelUrl ?? null,
        addDuration: addDuration ?? null,
        subscribers: subscribers ?? null,
      })
      .returning();

    await handler(tx, newItem.id, sellerUserName, {
      region, accountDetails, durationMonths,
      starsCount, channelUrl, subscribers, addDuration,
    });

    return newItem;
  });
};

module.exports = { uploadItemService };
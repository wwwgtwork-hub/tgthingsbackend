const { db } = require("../db.js");
const { users, item, account, premium, nftAndGift, stars, payment } = require("../src/db/schema.js");
const { eq, sql, and } = require("drizzle-orm");
const { sendNotificationService } = require("./SendNotification.js");
const { checkBan } = require('./middlewares/checkBan.js');
const buyItemService = async (data) => {
  const { buyerId, itemId } = data;
  if (!buyerId || !itemId) throw new Error("Buyer ID and Item ID are required");
  return await db.transaction(async (tx) => {
    const [targetItem] = await tx.select().from(item).where(eq(item.id, Number(itemId)));
    if (!targetItem) throw new Error("Item not found");
    if (targetItem.status === "in_escrow") throw new Error("Item is currently in escrow — awaiting confirmation");
    if (targetItem.status === "sold") throw new Error("Item has already been sold");
    if (targetItem.status === "inactive") throw new Error("Item is not available for purchase");
    if (targetItem.status !== "active") throw new Error(`Item is unavailable (status: ${targetItem.status})`);

    const [buyer] = await tx.select().from(users).where(eq(users.telegramId, String(buyerId)));
    if (!buyer) throw new Error("Buyer not found");

    const now = new Date();
    if (buyer.isBanned || (buyer.bannedUntil && new Date(buyer.bannedUntil) > now)) {
      throw new Error("User is banned");
    }
    const checkSeller = checkBan(targetItem.sellerId);
    if (buyer.moneyCount < targetItem.price) throw new Error("Insufficient balance");

    const hoursToFreeze = 24;
    const frozenUntilDate = new Date(now.getTime() + hoursToFreeze * 60 * 60 * 1000);
    const [updatedUser] = await tx
      .update(users)
      .set({ moneyCount: sql`${users.moneyCount} - ${targetItem.price}` })
      .where(
        and(
          eq(users.telegramId, String(buyerId)),
          sql`${users.moneyCount} >= ${targetItem.price}` 
        )
      )
      .returning();

    if (!updatedUser) throw new Error("Insufficient balance or concurrent transaction detected");

    const [updatedItem] = await tx.update(item)
      .set({
        status: "in_escrow",
        buyerId: String(buyerId),
        escrowPrice: Math.trunc(targetItem.price * 0.93),
        frozenUntil: sql`NOW() + INTERVAL '24 hours'`, 
      })
      .where(eq(item.id, Number(itemId)))
      .returning();

    const [seller] = await tx.select().from(users).where(eq(users.telegramId, targetItem.sellerId));
    if (!seller) throw new Error("Seller not found");

    await tx.insert(payment).values({
      userId: String(buyerId),
      sellerId: String(seller.telegramId),
      itemId: Number(itemId),
      amount: Math.trunc(targetItem.price * 0.93),
      type: "purchase_escrow",
      description: `Удержание средств за покупку: ${targetItem.name}`,
    });


    let secretPayload = null;
    if (targetItem.itemType === "account") {
      const [acc] = await tx.select().from(account).where(eq(account.itemId, targetItem.id));
      if (acc) secretPayload = { region: acc.region, accountDetails: acc.accountDetails };
    } else if (targetItem.itemType === "premium") {
      const [prem] = await tx.select().from(premium).where(eq(premium.itemId, targetItem.id));
      if (prem) secretPayload = { durationMonths: prem.durationMonths };
    } else if (targetItem.itemType === "nft_and_gift") {
      const [nft] = await tx.select().from(nftAndGift).where(eq(nftAndGift.itemId, targetItem.id));
      if (nft) secretPayload = {
        type: nft.type,
        blockchainAddress: nft.blockchainAddress,
        secretLinkOrCode: nft.secretLinkOrCode,
        extraInfo: nft.extraInfo,
      };
    } else if (targetItem.itemType === "stars") {
      const [starPack] = await tx.select().from(stars).where(eq(stars.itemId, targetItem.id));
      if (starPack) secretPayload = { starsCount: starPack.starsCount };
    }

    await sendNotificationService(
      "TGThings",
      `Ваш товар ${targetItem.name} продан`,
      `Выдайте товар как можно быстрее, чтобы получить хороший отзыв`,
      String(seller.telegramId),
    );

    return {
      newBalance: updatedUser.moneyCount,
      sellerName: seller.userName ?? "Unknown",
      itemType: targetItem.itemType,
      frozenUntil: updatedItem.frozenUntil,
      productDetails: secretPayload,
    };
  });
};

module.exports = { buyItemService };
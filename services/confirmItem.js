const { db } = require('../db');
const { users, item, payment } = require('../src/db/schema');
const { eq, sql, and } = require('drizzle-orm');

const confirmItemService = async ({ itemId, sellerId }) => {
  return await db.transaction(async (tx) => {
    const [foundItem] = await tx.select().from(item).where(eq(item.id, itemId));
    if (!foundItem) throw new Error('Item not found');
    if (foundItem.status !== 'in_escrow') throw new Error('Transaction already completed or invalid');
    if (foundItem.sellerId !== String(sellerId)) throw new Error('Only the seller can request payout');

    const [foundPayment] = await tx.select().from(payment).where(eq(payment.itemId, itemId));
    if (!foundPayment) throw new Error('Payment not found');

    const bothConfirmed = foundPayment.buyerConfirmed && foundPayment.sellerConfirmed;
    if (!bothConfirmed) {
      const [{ dbNow }] = await tx.execute(sql`SELECT NOW() as "dbNow"`);
      if (!foundItem.frozenUntil || new Date(foundItem.frozenUntil) > new Date(dbNow)) {
        throw new Error('Ждем подтверждение обеих сторон или истечения эскроу.');
      }
    }

    const [seller] = await tx.select().from(users).where(eq(users.telegramId, String(sellerId)));
    if (!seller) throw new Error('Seller not found');

    const [buyer] = await tx.select().from(users).where(eq(users.telegramId, foundItem.buyerId));
    if (!buyer) throw new Error('Buyer not found');
    const sellerPayout = foundItem.escrowPrice; 

    await tx.update(users)
      .set({
        moneyCount: sql`${users.moneyCount} + ${sellerPayout}`,
        userItemsSelled: sql`${users.userItemsSelled} + 1`,
        selledTotal: sql`${users.selledTotal} + ${sellerPayout}`,
      })
      .where(eq(users.telegramId, String(sellerId)));

    await tx.update(users)
      .set({
        userItemsBought: sql`${users.userItemsBought} + 1`,
        purchasedTotal: sql`${users.purchasedTotal} + ${foundItem.price}`,
      })
      .where(eq(users.telegramId, foundItem.buyerId));
    await tx.update(payment)
      .set({
        type: 'completed',
        description: `Сделка завершена. Комиссия платформы 7%`,
      })
      .where(eq(payment.itemId, itemId));

    const [completedItem] = await tx.update(item)
      .set({
        status: 'completed',
        escrowPrice: 0,
        payoutAt: sql`NOW()`,
      })
      .where(eq(item.id, itemId))
      .returning();

    return {
      ...completedItem,
      sellerPayout,
    };
  });
};

module.exports = { confirmItemService };
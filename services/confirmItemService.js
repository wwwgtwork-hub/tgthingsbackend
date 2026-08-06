const { db } = require('../db');
const { item, payment } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm');

const buyerConfirmService = async ({ itemId, buyerId }) => {
  if (!itemId || !buyerId) throw new Error('itemId and buyerId are required');

  return await db.transaction(async (tx) => {
    const [foundItem] = await tx.select().from(item).where(eq(item.id, Number(itemId)));
    if (!foundItem) throw new Error('Item not found');
    if (foundItem.status !== 'in_escrow') throw new Error('Transaction already completed or invalid');
    if (foundItem.buyerId !== String(buyerId)) throw new Error('You are not the buyer of this item');

    const [foundPayment] = await tx.select().from(payment).where(eq(payment.itemId, Number(itemId)));
    if (!foundPayment) throw new Error('Payment not found');
    if (foundPayment.buyerConfirmed) throw new Error('Buyer already confirmed');

    const [updatedPayment] = await tx.update(payment)
      .set({ buyerConfirmed: true })
      .where(eq(payment.itemId, Number(itemId)))
      .returning();

    return updatedPayment;
  });
};

const sellerConfirmService = async ({ itemId, sellerId }) => {
  if (!itemId || !sellerId) throw new Error('itemId and sellerId are required');

  return await db.transaction(async (tx) => {
    const [foundItem] = await tx.select().from(item).where(eq(item.id, Number(itemId)));
    if (!foundItem) throw new Error('Item not found');
    if (foundItem.status !== 'in_escrow') throw new Error('Transaction already completed or invalid');
    if (foundItem.sellerId !== String(sellerId)) throw new Error('You are not the seller of this item');

    const [foundPayment] = await tx.select().from(payment).where(eq(payment.itemId, Number(itemId)));
    if (!foundPayment) throw new Error('Payment not found');
    if (foundPayment.sellerConfirmed) throw new Error('Seller already confirmed');

    const [updatedPayment] = await tx.update(payment)
      .set({ sellerConfirmed: true })
      .where(eq(payment.itemId, Number(itemId)))
      .returning();

    return updatedPayment;
  });
};

module.exports = { buyerConfirmService, sellerConfirmService };
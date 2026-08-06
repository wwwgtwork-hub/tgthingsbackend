const { db } = require('../db');
const { users, item, payment } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm');
const { sendNotificationService } = require('./SendNotification');


const buyerConfirmDeclineService = async ({ itemId, buyerId }) => {
  const [foundItem] = await db.select().from(item).where(eq(item.id, itemId));
  if (!foundItem) throw new Error('Item not found');
  if (foundItem.status !== 'in_escrow') throw new Error('Item is not in escrow');
  if (foundItem.buyerId !== String(buyerId)) throw new Error('Only the buyer can confirm decline');

  const [updatedPayment] = await db.update(payment)
    .set({ buyerDeclineConfirmed: true })
    .where(eq(payment.itemId, itemId))
    .returning();

  const [seller] = await db.select().from(users).where(eq(users.telegramId, foundItem.sellerId));
  if (seller) {
    await sendNotificationService(
      'TGThings',
      'Покупатель хочет отменить сделку',
      'Покупатель подтвердил отказ от сделки. Подтвердите отмену со своей стороны.',
      seller.telegramId,
    );
  }

  return updatedPayment;
};

const sellerConfirmDeclineService = async ({ itemId, sellerId }) => {
  const [foundItem] = await db.select().from(item).where(eq(item.id, itemId));
  if (!foundItem) throw new Error('Item not found');
  if (foundItem.status !== 'in_escrow') throw new Error('Item is not in escrow');
  if (foundItem.sellerId !== String(sellerId)) throw new Error('Only the seller can confirm decline');

  const [updatedPayment] = await db.update(payment)
    .set({ sellerDeclineConfirmed: true })
    .where(eq(payment.itemId, itemId))
    .returning();

  const [buyer] = await db.select().from(users).where(eq(users.telegramId, foundItem.buyerId));
  if (buyer) {
    await sendNotificationService(
      'TGThings',
      'Продавец хочет отменить сделку',
      'Продавец подтвердил отказ от сделки. Подтвердите отмену со своей стороны.',
      buyer.telegramId,
    );
  }

  return updatedPayment;
};
const declineItemService = async ({ itemId }) => {
  return await db.transaction(async (tx) => {
    const [foundItem] = await tx.select().from(item).where(eq(item.id, itemId));
    if (!foundItem) throw new Error('Item not found');
    if (foundItem.status !== 'in_escrow') throw new Error('Item is not in escrow');

    const [foundPayment] = await tx.select().from(payment).where(eq(payment.itemId, itemId));
    if (!foundPayment) throw new Error('Payment not found');

    if (!foundPayment.buyerDeclineConfirmed || !foundPayment.sellerDeclineConfirmed) {
      throw new Error('Обе стороны должны подтвердить отмену сделки');
    }

    const [buyer] = await tx.select().from(users).where(eq(users.telegramId, foundItem.buyerId));
    if (!buyer) throw new Error('Buyer not found');
    const refundAmount = foundItem.price;

    await tx.update(users)
      .set({ moneyCount: sql`${users.moneyCount} + ${refundAmount}` })
      .where(eq(users.telegramId, foundItem.buyerId));

    const [refundedItem] = await tx.update(item)
      .set({ buyerId: null, escrowPrice: 0, status: 'active' })
      .where(eq(item.id, itemId))
      .returning();

    await tx.update(payment)
      .set({ type: 'refunded' })
      .where(eq(payment.itemId, itemId));

    const [seller] = await tx.select().from(users).where(eq(users.telegramId, foundItem.sellerId));

    await sendNotificationService(
      'TGThings',
      'Сделка отменена',
      `Сделка по товару "${foundItem.name}" отменена. Средства возвращены покупателю.`,
      buyer.telegramId,
    );
    if (seller) {
      await sendNotificationService(
        'TGThings',
        'Сделка отменена',
        `Сделка по товару "${foundItem.name}" отменена. Товар снова активен.`,
        seller.telegramId,
      );
    }

    return refundedItem;
  });
};
const adminDeclineItemService = async ({ itemId, adminId, reason }) => {
  return await db.transaction(async (tx) => {
    const [foundItem] = await tx.select().from(item).where(eq(item.id, itemId));
    if (!foundItem) throw new Error('Item not found');
    if (foundItem.status !== 'in_escrow') throw new Error('Item is not in escrow');

    const [buyer] = await tx.select().from(users).where(eq(users.telegramId, foundItem.buyerId));
    if (!buyer) throw new Error('Buyer not found');

    const refundAmount = foundItem.price;

    await tx.update(users)
      .set({ moneyCount: sql`${users.moneyCount} + ${refundAmount}` })
      .where(eq(users.telegramId, foundItem.buyerId));

    const [refundedItem] = await tx.update(item)
      .set({ buyerId: null, escrowPrice: 0, status: 'active' })
      .where(eq(item.id, itemId))
      .returning();

    await tx.update(payment)
      .set({ type: 'admin_declined' })
      .where(eq(payment.itemId, itemId));

    const [seller] = await tx.select().from(users).where(eq(users.telegramId, foundItem.sellerId));
    const reasonText = reason ? `Причина: ${reason}` : 'Причина не указана.';

    await sendNotificationService(
      'TGThings',
      'Сделка отменена администратором',
      `Сделка по товару "${foundItem.name}" принудительно отменена администратором. ${reasonText} Средства возвращены.`,
      buyer.telegramId,
    );
    if (seller) {
      await sendNotificationService(
        'TGThings',
        'Сделка отменена администратором',
        `Сделка по товару "${foundItem.name}" принудительно отменена администратором. ${reasonText} Товар снова активен.`,
        seller.telegramId,
      );
    }

    return refundedItem;
  });
};

module.exports = {
  buyerConfirmDeclineService,
  sellerConfirmDeclineService,
  declineItemService,
  adminDeclineItemService,
};
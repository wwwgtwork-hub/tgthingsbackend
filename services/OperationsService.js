const { eq, and, isNotNull, inArray } = require('drizzle-orm');
const { item } = require('../src/db/schema');
const { db } = require('../db');
const getOperations = async (userId) => {
  if (!userId) throw new Error('userId обязателен');
  const stringUserId = String(userId);

  const COMPLETED_STATUSES = ['sold', 'in_escrow', 'completed'];

  const [boughtItems, soldItems] = await Promise.all([
    db.select().from(item).where(
      and(
        eq(item.buyerId, stringUserId),
        inArray(item.status, COMPLETED_STATUSES)
      )
    ),
    db.select().from(item).where(
      and(
        eq(item.sellerId, stringUserId),
        isNotNull(item.buyerId),
        inArray(item.status, COMPLETED_STATUSES) 
      )
    ),
  ]);

  return { boughtItems, soldItems };
};
module.exports = { getOperations };
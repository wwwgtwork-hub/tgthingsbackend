const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { payment } = require('../src/db/schema');

const getPaymentService = async (itemId) => {
  const [data] = await db
    .select()
    .from(payment)
    .where(eq(payment.itemId, Number(itemId)));
  return data ?? null;
};

module.exports = { getPaymentService };
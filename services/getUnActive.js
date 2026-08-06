const { db } = require('../db');
const { item } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const getUnActiveItemsService = async () => {
  const items = await db
    .select()
    .from(item)
    .where(eq(item.status, "checking"));
  return items; 
};

module.exports = { getUnActiveItemsService };

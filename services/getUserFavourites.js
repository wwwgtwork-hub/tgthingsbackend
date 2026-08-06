const { eq, sql } = require('drizzle-orm');
const { favouriteItem, item } = require('../src/db/schema');
const { db } = require('../db');

const getUserFavouritesService = async (incomingUserId) => {
  if (!incomingUserId || incomingUserId === 'null' || incomingUserId === 'undefined') {
    throw new Error("User id is invalid or missing!");
  }

  const favouritesWithItems = await db
    .select({ item: item })
    .from(favouriteItem)
    .innerJoin(item, eq(item.id, sql`CAST(${favouriteItem.projectId} AS INTEGER)`))
    .where(eq(favouriteItem.userId, String(incomingUserId)));

  return favouritesWithItems.map(row => row.item);
};

module.exports = { getUserFavouritesService };
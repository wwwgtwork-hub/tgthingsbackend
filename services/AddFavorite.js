const { favouriteItem } = require('../src/db/schema.js');
const { db } = require('../db.js');
const { eq, and } = require('drizzle-orm');

const toggleFavouriteService = async (userId, itemId) => {
  try {
    const projectId = String(itemId);
    const existing = await db
      .select()
      .from(favouriteItem)
      .where(and(
        eq(favouriteItem.userId, userId),       
        eq(favouriteItem.projectId, projectId)
      ))
      .limit(1);

    if (existing.length > 0) {
      const [deleted] = await db
        .delete(favouriteItem)
        .where(and(
          eq(favouriteItem.userId, userId),     
          eq(favouriteItem.projectId, projectId)
        ))
        .returning();

      return { action: 'removed', data: deleted };
    } else {
      const [added] = await db
        .insert(favouriteItem)
        .values({ userId, projectId })          
        .returning();

      return { action: 'added', data: added };
    }
  } catch (error) {
    throw new Error(`Ошибка переключения избранного: ${error.message}`);
  }
};

module.exports = { toggleFavouriteService };
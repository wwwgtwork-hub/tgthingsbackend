const { db } = require('../db');
const { users, rate } = require('../src/db/schema');
const { eq } = require('drizzle-orm');
const checkUserService = async (userId) => {
  if (!userId) {
    throw new Error('User ID is required');
  }
  const cleanId = String(userId);
  const userRating = await db
    .select()
    .from(rate)
    .where(eq(rate.ratedId, cleanId));

  const userData = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, cleanId));

  if (userData.length === 0) {
    return null;
  }

  const currentUser = userData[0];

  if (currentUser.bannedUntil) {
    const now = new Date();
    const banExpiration = new Date(currentUser.bannedUntil);

    if (now < banExpiration) {
      throw new Error(`ВЫ ЗАБАНЕНЫ ДО ${banExpiration.toLocaleString()}. ОБРАТИТЕСЬ К АДМИНИСТРАТОРУ ПОСЛЕ ИСТЕЧЕНИЯ СРОКА.`);
    }

    await db
      .update(users)
      .set({ isBanned: false, bannedUntil: null, banReason: null })
      .where(eq(users.telegramId, cleanId));
  }

  return [currentUser, userRating];
}

module.exports = { checkUserService };
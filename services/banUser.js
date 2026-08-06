const { db } = require('../db');
const { users } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

const banUserService = async (telegramId, data) => {
  const { reason, durationHours } = data;

  if (!telegramId || !durationHours) {
    throw new Error('telegramId и durationHours обязательны');
  }

  const bannedUntilDate = new Date();
  bannedUntilDate.setHours(bannedUntilDate.getHours() + Number(durationHours));

  const updated = await db
    .update(users)
    .set({
      isBanned: true,
      bannedUntil: bannedUntilDate,
      banReason: reason || 'Нарушение правил маркетплейса'
    })
    .where(eq(users.telegramId, String(telegramId)))
    .returning();

  if (updated.length === 0) throw new Error('Пользователь не найден');

  return {
    success: true,
    message: `Пользователь забанен до ${bannedUntilDate.toLocaleString('ru-RU')}`,
    bannedUntil: bannedUntilDate,
  };
};

const unbanUserService = async (telegramId) => {
  if (!telegramId) throw new Error('telegramId обязателен');

  const updated = await db
    .update(users)
    .set({
      isBanned: false,
      bannedUntil: null,
      banReason: null,
    })
    .where(eq(users.telegramId, String(telegramId)))
    .returning();

  if (updated.length === 0) throw new Error('Пользователь не найден');

  return {
    success: true,
    message: 'Пользователь разбанен',
  };
};

module.exports = { banUserService, unbanUserService };
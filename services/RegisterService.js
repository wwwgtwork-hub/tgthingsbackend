const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { users } = require('../src/db/schema');


const registerUserService = async ({ telegramUser }) => {
  const telegramId = telegramUser?.id;
  const username = telegramUser?.username || null;
  const name = telegramUser?.firstName || null;

  if (!telegramId) {
    throw new Error('Не удалось определить пользователя');
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, telegramId));

  if (existingUser) {
    if (existingUser.userName !== username || existingUser.name !== name) {
      const [updatedUser] = await db
        .update(users)
        .set({ userName: username, name })
        .where(eq(users.telegramId, telegramId))
        .returning();
      return { message: 'Данные обновлены', user: updatedUser };
    }
    return { message: 'Success', user: existingUser };
  }

  const [newUser] = await db.insert(users).values({
    telegramId,
    userName: username,
    name,
  }).returning();

  return { message: 'Зарегистрирован', user: newUser };
};

module.exports = { registerUserService };
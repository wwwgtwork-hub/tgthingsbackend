const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { users } = require('../src/db/schema');

const registerUserService = async ({ username, name, telegramId }) => {
  if (!username || !name || !telegramId) {
    throw new Error('Поля обязательны');
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, String(telegramId)));
  if (existingUser) {
    if (existingUser.userName !== username || existingUser.name !== name) {
      const [updatedUser] = await db
        .update(users)
        .set({ userName: username, name })
        .where(eq(users.telegramId, String(telegramId)))
        .returning();
      return { message: 'Данные обновлены', user: updatedUser };
    }
    return { message: 'Success', user: existingUser };
  }


  const [newUser] = await db.insert(users).values({
    telegramId: String(telegramId),
    userName: username,
    name,
  }).returning();

  return { message: 'Зарегистрирован', user: newUser };
};

module.exports = { registerUserService };
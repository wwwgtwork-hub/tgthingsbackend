const { db } = require('../../db');
const { users } = require('../../src/db/schema');
const { eq } = require('drizzle-orm');
const checkBan = async (telegramId) => {
  const user = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, String(telegramId)))
    .limit(1);

  const u = user[0];
  if (!u) return;

  if (u.isBanned) {
    if (u.bannedUntil && new Date(u.bannedUntil) < new Date()) {
      await db.update(users)
        .set({ isBanned: false, bannedUntil: null, banReason: null })
        .where(eq(users.telegramId, String(telegramId)));
      return;
    }
    throw new Error(
      `ВЫ ЗАБАНЕНЫ${u.banReason ? `: ${u.banReason}` : ""}${u.bannedUntil ? ` до ${new Date(u.bannedUntil).toLocaleString("ru-RU")}` : ""}`
    );
  }
};
module.exports = { checkBan };
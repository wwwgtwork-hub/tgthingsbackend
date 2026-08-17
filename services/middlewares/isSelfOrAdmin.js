const { eq } = require("drizzle-orm");
const { db } = require("../db.js");
const { users } = require("../src/db/schema.js");

async function isSelfOrAdmin(req, targetTelegramId) {
  const callerId = req.telegramUser?.id;
  if (!callerId) return false;

  if (String(callerId) === String(targetTelegramId)) return true;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.telegramId, String(callerId)));

  return !!user?.isAdmin;
}

module.exports = { isSelfOrAdmin };
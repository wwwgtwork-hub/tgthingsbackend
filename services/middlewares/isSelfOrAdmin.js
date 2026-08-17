const { eq } = require("drizzle-orm");
const { db } = require("../db.js");
const { users } = require("../src/db/schema.js");

/**
 * True if the authenticated caller (req.telegramUser, set by
 * requireTelegramAuth from verified initData) is either:
 *   - the same person as targetTelegramId, or
 *   - an admin (same `isAdmin` flag that requireAdmin checks)
 *
 * Always re-checks req.telegramUser — never trust targetTelegramId's
 * identity by itself, it's just the resource being requested.
 */
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

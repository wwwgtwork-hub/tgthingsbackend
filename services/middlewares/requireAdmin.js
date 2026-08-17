const { eq } = require("drizzle-orm");
const { db } = require("../../db.js");
const { users } = require("../../schema.js");


async function requireAdmin(req, res, next) {
  try {
    const telegramId = req.telegramUser?.id;
    if (!telegramId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId));

    if (!user?.isAdmin) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }

    req.adminUser = user;
    next();
  } catch (error) {
    console.error("requireAdmin error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

module.exports = { requireAdmin };

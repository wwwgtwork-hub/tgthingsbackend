const crypto = require("crypto");

const BOT_TOKEN = process.env.BOT_TOKEN;
// How old an initData payload is allowed to be, in seconds.
const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60;

if (!BOT_TOKEN) {
  // Fail loudly at boot rather than silently accepting unverifiable requests later.
  throw new Error("BOT_TOKEN env var is required for Telegram auth verification");
}

/**
 * Verifies a Telegram WebApp `initData` string per Telegram's documented algorithm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * Returns the verified user { id, username, firstName } or null if invalid/forged/expired.
 * NEVER trust `initDataUnsafe` fields from the client instead of this.
 */
function verifyTelegramInitData(initData) {
  if (!initData || typeof initData !== "string") return null;

  let params;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return null;
  }

  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  const hashBuf = Buffer.from(hash, "hex");
  const computedBuf = Buffer.from(computedHash, "hex");
  if (hashBuf.length !== computedBuf.length || !crypto.timingSafeEqual(hashBuf, computedBuf)) {
    return null;
  }

  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) {
    return null; // stale/replayed initData
  }

  const userJson = params.get("user");
  if (!userJson) return null;

  try {
    const user = JSON.parse(userJson);
    if (!user?.id) return null;
    return {
      id: String(user.id),
      username: user.username || null,
      firstName: user.first_name || null,
    };
  } catch {
    return null;
  }
}

/**
 * Express middleware: requires a valid, signed Telegram initData string.
 * Accepts it via header (preferred) or req.body.initData.
 * On success attaches req.telegramUser = { id, username, firstName }.
 */
function requireTelegramAuth(req, res, next) {
  const initData = req.headers["x-telegram-init-data"] || req.body?.initData;
  const verified = verifyTelegramInitData(initData);
  if (!verified) {
    return res.status(401).json({ error: "Не удалось подтвердить Telegram-сессию" });
  }
  req.telegramUser = verified;
  next();
}

module.exports = { verifyTelegramInitData, requireTelegramAuth };

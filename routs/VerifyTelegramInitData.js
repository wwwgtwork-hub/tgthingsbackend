// utils/verifyTelegramInitData.js
const crypto = require('crypto');

function verifyTelegramInitData(initData, botToken) {
  const urlParams = new URLSearchParams(initData);

  const hash = urlParams.get('hash');
  if (!hash) throw new Error('initData: hash отсутствует');

  urlParams.delete('hash');

  // сортировка по ключу и сборка data-check-string
  const dataCheckArr = [];
  for (const [key, value] of urlParams.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const computedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // timing-safe сравнение
  const validHash = crypto.timingSafeEqual(
    Buffer.from(computedHash, 'hex'),
    Buffer.from(hash, 'hex'),
  );

  if (!validHash) {
    throw new Error('initData: неверная подпись');
  }

  // опционально: проверка свежести (auth_date), например не старше 24ч
  const authDate = Number(urlParams.get('auth_date'));
  if (authDate) {
    const age = Date.now() / 1000 - authDate;
    if (age > 86400) {
      throw new Error('initData: данные устарели');
    }
  }

  const userRaw = urlParams.get('user');
  const user = userRaw ? JSON.parse(userRaw) : null;

  return user; // { id, first_name, last_name, username, ... }
}

module.exports = { verifyTelegramInitData };

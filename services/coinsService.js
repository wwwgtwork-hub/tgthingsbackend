// services/coinsService.js
const { db } = require('../db');
const { users, starPayments } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm');

// Начисление при оплате картой — вызывается из REST-роута сразу после
// подтверждения оплаты вашим эквайрингом.
const addCoinsService = async (userId, amount) => {
  try {
    if (!userId || amount === undefined) {
      throw new Error('Сумма пополнения и айди юзера обязательны');
    }
    if (amount < 1) {
      throw new Error('Сумма пополнения минимум 1 коин');
    }

    const updatedUser = await db
      .update(users)
      .set({ coins: sql`${users.coins} + ${amount}` })
      .where(eq(users.telegramId, String(userId)))
      .returning();

    if (updatedUser.length === 0) {
      throw new Error('User not found');
    }
    return updatedUser[0];
  } catch (e) {
    throw e;
  }
};

// Начисление при оплате Stars — вызывается ТОЛЬКО из bot/starsWebhook.js
// (обработчик successful_payment), никогда напрямую из клиента.
// Идемпотентно: если chargeId уже записан — коины повторно не начисляются.
const creditStarsPaymentService = async (userId, starsAmount, chargeId) => {
  try {
    if (!userId || !chargeId) {
      throw new Error('userId и chargeId обязательны');
    }
    if (!Number.isInteger(starsAmount) || starsAmount < 1) {
      throw new Error('Некорректная сумма starsAmount');
    }

    const coins = starsAmount; // курс 1 coin = 1 star

    return await db.transaction(async (trx) => {
      try {
        await trx.insert(starPayments).values({
          chargeId,
          userId: String(userId),
          starsAmount,
          coins,
        });
      } catch (e) {
        if (e.code === '23505') {
          // такой charge_id уже обработан — платёж не задваиваем
          return { alreadyProcessed: true, user: null };
        }
        throw e;
      }

      const updatedUser = await trx
        .update(users)
        .set({ coins: sql`${users.coins} + ${coins}` })
        .where(eq(users.telegramId, String(userId)))
        .returning();

      if (updatedUser.length === 0) {
        throw new Error('User not found for stars payment');
      }

      return { alreadyProcessed: false, user: updatedUser[0] };
    });
  } catch (e) {
    throw e;
  }
};

module.exports = { addCoinsService, creditStarsPaymentService };
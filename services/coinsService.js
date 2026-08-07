const { db } = require('../db');
const { users, starPayments } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm');


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
      .set({ moneyCount: sql`${users.moneyCount} + ${amount}` })
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


const creditStarsPaymentService = async (userId, starsAmount, chargeId) => {
  try {
    if (!userId || !chargeId) {
      throw new Error('userId и chargeId обязательны');
    }
    if (!Number.isInteger(starsAmount) || starsAmount < 1) {
      throw new Error('Некорректная сумма starsAmount');
    }

    const coins = starsAmount; 

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
          return { alreadyProcessed: true, user: null };
        }
        throw e;
      }

      const updatedUser = await trx
        .update(users)
        .set({ moneyCount: sql`${users.moneyCount} + ${coins}` })
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
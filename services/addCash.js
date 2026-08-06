const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { users } = require('../src/db/schema');
const { eq, sql } = require('drizzle-orm'); 
router.use(express.json());

const addCashService = async (userId, amount) => {
  try {

    if (!userId || amount === undefined) {
      throw new Error('Сумма пополнения и айди юзера обязательны');
    }
    if (amount < 100){
      throw new Error("Сумма пополнения минимум 100рулей");
    }
    const updatedUser = await db
      .update(users)
      .set({
        moneyCount: sql`${users.moneyCount} + ${amount}` 
      })
      .where(eq(users.telegramId, String(userId))) 
      .returning();
      
    if (updatedUser.length === 0) {
      throw new error('User not found');
    }
    return updatedUser[0];
  } catch (e) {
    throw e;
  } 
}


module.exports = { addCashService };
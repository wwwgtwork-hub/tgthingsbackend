const { db } = require("../db");
const { users, payout } = require("../src/db/schema");
const { eq } = require("drizzle-orm");
const { checkBan } = require('./middlewares/checkBan');
const MAX_PAYOUT = 5000;

const payoutService = async (payoutData) => {
  const { id, amount, wallet } = payoutData;

  if (!id || !amount || !wallet) {
    throw new Error("User ID, amount and wallet are required");
  }
  const checked = checkBan(id);
  const userId = String(id);
  const payoutAmount = parseFloat(amount);
  const walletClean = String(wallet).trim();

  if (isNaN(payoutAmount) || payoutAmount <= 0) {
    throw new Error("Invalid payout amount");
  }

  if (payoutAmount > MAX_PAYOUT) {
    throw new Error(`Payout amount exceeds the maximum limit of ${MAX_PAYOUT} rubles`);
  }

  return await db.transaction(async (tx) => {
    const userData = await tx
      .select()
      .from(users)
      .where(eq(users.telegramId, userId));

    if (userData.length === 0) {
      throw new Error("User not found");
    }

    const currentBalance = parseFloat(userData[0].moneyCount) || 0;

    if (currentBalance < payoutAmount) {
      throw new Error("Insufficient balance");
    }

    const newBalance = currentBalance - payoutAmount;

    const updatedUser = await tx
      .update(users)
      .set({ moneyCount: newBalance }) 
      .where(eq(users.telegramId, userId))
      .returning();

    if (updatedUser.length === 0) {
      throw new Error("User not found during update");
    }

    await tx.insert(payout).values({
      userId,
      amount: payoutAmount,
      wallet: walletClean,
      status: "pending",
      createdAt: new Date(),
    });

    return {
      newBalance: updatedUser[0].moneyCount,
      wallet: walletClean,
    };
  });
};

async function getPayoutsListService() {
  try {


    const list = await db.select().from(payout);

    const totalAmount = list.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0),
      0,
    );
    const totalCount = list.length;

    return {
      payouts: list,
      stats: {
        totalCount,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
    };
  } catch (e) {
    throw e;
  }
}

const nextPayoutService = async (payoutId) => {
  if (!payoutId) throw new Error("Payout ID is required");

  const updated = await db
    .update(payout)
    .set({ status: "success" })
    .where(eq(payout.id, Number(payoutId)))
    .returning();

  if (updated.length === 0) throw new Error("Payout not found");

  return updated[0];
};

const getUserPayoutsService = async (userId) => {
  if (!userId) throw new Error("User ID is required");

  const list = await db
    .select()
    .from(payout)
    .where(eq(payout.userId, String(userId)));

  const totalAmount = list.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  return {
    payouts: list,
    stats: {
      totalCount: list.length,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
    },
  };
};

module.exports = {
  payoutService,
  getPayoutsListService,
  nextPayoutService,      
  getUserPayoutsService,  
};
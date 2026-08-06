const { eq, and } = require("drizzle-orm");
const { db } = require("../db");
const { users, rate: rateTable, item } = require("../src/db/schema");
const { checkBan } = require('./middlewares/checkBan');
const rateItemService = async ({ raterId, ratedId, itemId, description, ratingValue }) => {
  if (!raterId || !ratedId || !itemId || !description || ratingValue === undefined) {
    throw new Error("Все поля обязательны для заполнения");
  }
  if (ratingValue < 1 || ratingValue > 5) {
    throw new Error("Рейтинг должен быть числом от 1 до 5");
  }
  if (String(raterId) === String(ratedId)) {
    throw new Error("Нельзя оставить отзыв самому себе");
  } 
  const checked = checkBan(raterId);
  return await db.transaction(async (tx) => {
    const [foundItem] = await tx.select().from(item).where(eq(item.id, Number(itemId)));
    if (!foundItem) throw new Error("Сделка не найдена");
    if (foundItem.status !== "completed") throw new Error("Нельзя оставить отзыв до завершения сделки");

    const isBuyer = foundItem.buyerId === String(raterId);
    const isSeller = foundItem.sellerId === String(raterId);
    if (!isBuyer && !isSeller) throw new Error("Вы не являетесь участником этой сделки");

    const expectedRatedId = isBuyer ? foundItem.sellerId : foundItem.buyerId;
    if (expectedRatedId !== String(ratedId)) throw new Error("Неверный получатель отзыва");

    const [existingRate] = await tx.select().from(rateTable).where(
      and(
        eq(rateTable.itemId, Number(itemId)),
        eq(rateTable.raterId, String(raterId))
      )
    );
    if (existingRate) throw new Error("Вы уже оставили отзыв по этой сделке");

    const [targetUser] = await tx.select().from(users).where(eq(users.telegramId, String(ratedId)));
    if (!targetUser) throw new Error("Пользователь не найден");


    const [newRateRecord] = await tx.insert(rateTable).values({
      itemId: Number(itemId),
      description,
      rating: Number(ratingValue),
      raterId: String(raterId),
      ratedId: String(ratedId),
    }).returning();


    const allRatings = await tx
      .select({ rating: rateTable.rating })
      .from(rateTable)
      .where(eq(rateTable.ratedId, String(ratedId)));

    const avg = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    const newAverageRating = Number(avg.toFixed(2));

    await tx.update(users)
      .set({ rating: newAverageRating })
      .where(eq(users.telegramId, String(ratedId)));

    const ratingStatus =
      ratingValue < 2.5 ? "bad"
      : ratingValue < 4 ? "neutral"
      : "good";

    return { rateRecord: newRateRecord, newAverageRating, ratingStatus };
  });
};

module.exports = { rateItemService };
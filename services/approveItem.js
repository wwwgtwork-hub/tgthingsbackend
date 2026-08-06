const { db } = require("../db");
const { item } = require("../src/db/schema");
const { eq } = require("drizzle-orm");
const { sendNotificationService } = require("./SendNotification");

const approveItemService = async (itemId) => {
  if (!itemId) throw new Error('itemId обязателен');

  try {
    const [updatedItem] = await db
      .update(item)
      .set({ status: 'active' })
      .where(eq(item.id, itemId))
      .returning();

    if (!updatedItem) {
      throw new Error(`Товар с ID ${itemId} не найден`);
    }
    try {
      await sendNotificationService(
        'Модерационная команда TGThings',
        `Ваш товар "${updatedItem.name}" был одобрен`,
        `Публикация вашего товара "${updatedItem.name}" одобрена модерационной командой TGThings`,
        updatedItem.sellerId
      );
    } catch (notifError) {
      console.error(`Не удалось отправить уведомление для товара ${itemId}: ${notifError.message}`);
    }

    return { success: true, item: updatedItem };
  } catch (e) {
    console.error(`Ошибка в approveItemService: ${e.message}`);
    throw e;
  }
};
module.exports = { approveItemService };

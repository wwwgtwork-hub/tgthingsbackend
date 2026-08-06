const { db } = require("../db");
const { item } = require("../src/db/schema"); 
const { eq } = require("drizzle-orm");
const { sendNotificationService } = require("./SendNotification");

const deleteItemService = async (itemId, reason) => {
  if (!itemId) {
    throw new Error("Item ID is required");
  }
  
  const cleanId = Number(itemId);
  const [foundItem] = await db
    .select({ 
      sellerId: item.sellerId,
      name: item.name 
    })
    .from(item)
    .where(eq(item.id, cleanId));
  
  if (!foundItem) {
    throw new Error("Item not found");
  }

  const realReason = reason || "Данные о товаре заполнены неправильно";

  try {
    await sendNotificationService(
      'system_moderator', 
      'Товар удален модератором', 
      `Ваш товар "${foundItem.name}" удален по причине: ${realReason}`, 
      foundItem.sellerId
    );
  } catch (notificationError) {
    console.error("Ошибка отправки уведомления при удалении товара:", notificationError);
  }

  const [deletedItem] = await db
    .delete(item) 
    .where(eq(item.id, cleanId))
    .returning();

  return {
    deletedItem: deletedItem,
  };
};


module.exports = { deleteItemService };

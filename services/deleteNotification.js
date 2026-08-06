const { eq } = require("drizzle-orm");
const { message } = require("../src/db/schema");
const { db } = require("../db");

const deleteNotificationService = async (notificationId) => {
  const notifId = Number(notificationId);
  const [deleted] = await db
    .delete(message)
    .where(eq(message.id, notifId))
    .returning();

  return deleted;
};

module.exports = { deleteNotificationService };

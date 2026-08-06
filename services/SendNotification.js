const { eq } = require('drizzle-orm');
const { db } = require('../db');
const { message } = require('../src/db/schema.js'); 

const sendNotificationService = async (from, title, description, to) => {
  try {
    await db.insert(message).values({
      from: from,       
      to: to,           
      title: title,
      description: description,
    });

    return { success: true };
  } catch (error) {
    console.error("Ошибка при отправке уведомления:", error);
    return { success: false, error: error.message }; 
  }
};

module.exports = { sendNotificationService };

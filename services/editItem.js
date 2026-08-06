const { db } = require('../db');
const { item } = require('../src/db/schema');
const { eq } = require('drizzle-orm');

const editItemService = async (itemData) => {
  const { id, name, description, price } = itemData;

  if (!id) throw new Error('Item ID is required');

  const cleanId = Number(id);
  const updatedFields = {};

  if (name) updatedFields.name = name;
  if (description) updatedFields.description = description;
  if (price) updatedFields.price = Number(price);

  if (Object.keys(updatedFields).length === 0) {
    throw new Error('At least one field must be provided for update');
  }

  const updatedItem = await db
    .update(item)
    .set(updatedFields)
    .where(eq(item.id, cleanId))
    .returning();

  if (updatedItem.length === 0) throw new Error('Item not found');

  return updatedItem[0];
};

module.exports = { editItemService };
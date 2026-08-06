const postgres = require('postgres');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL; 

if (!connectionString) {
  console.error("Ошибка: Переменная окружения с URL базы данных не найдена в .env");
  process.exit(1);
}

const sqlClient = postgres(connectionString, { max: 1 });

async function clearDatabase() {
  try {
    console.log('Удаление старой схемы базы данных...');
    
    await sqlClient`DROP SCHEMA public CASCADE;`;
    await sqlClient`CREATE SCHEMA public;`;
    
    console.log('База данных успешно очищена!');
    await sqlClient.end();
    process.exit(0);
  } catch (error) {
    console.error('Ошибка при очистке БД:', error);
    await sqlClient.end();
    process.exit(1);
  }
}

clearDatabase();

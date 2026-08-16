const { User } = require("../models/User");

// Foydalanuvchini topish yoki yangi yaratish
// Har safar /start bosilganda chaqiriladi
async function createOrUpdateUser(telegramUser) {
  const { id, first_name, last_name, username } = telegramUser;

  const user = await User.findOneAndUpdate(
    { telegramId: id },
    {
      telegramId: id,
      firstName: first_name || "",
      lastName: last_name || "",
      username: username || "",
    },
    {
      upsert: true,
      returnDocument: "after",
      setDefaultsOnInsert: true,
    }
  );

  return user;
}

// Telegram ID orqali foydalanuvchini topish
async function getUserByTelegramId(telegramId) {
  const user = await User.findOne({ telegramId });
  return user;
}

// Foydalanuvchi telefon raqamini saqlash
async function saveUserPhone(telegramId, phone) {
  const user = await User.findOneAndUpdate(
    { telegramId },
    { phone },
    { returnDocument: "after" }
  );
  return user;
}

// Foydalanuvchi manzilini saqlash
async function saveUserAddress(telegramId, address) {
  const user = await User.findOneAndUpdate(
    { telegramId },
    { address },
    { returnDocument: "after" }
  );
  return user;
}

module.exports = {
  createOrUpdateUser,
  getUserByTelegramId,
  saveUserPhone,
  saveUserAddress,
};

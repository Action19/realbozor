const { Seller } = require("../models/Seller");
const { User } = require("../models/User");
const { Product } = require("../models/Product");

// Sotuvchi arizasini yuborish
async function applyForSeller(telegramId, { shopName, description, phone }) {
  // Foydalanuvchini topish
  const user = await User.findOne({ telegramId });
  if (!user) throw new Error("Foydalanuvchi topilmadi");

  // Allaqachon sotuvchi yoki ariza bergan
  const existing = await Seller.findOne({ telegramId });
  if (existing) return { alreadyApplied: true, seller: existing };

  // Yangi sotuvchi arizasi
  const seller = await Seller.create({
    userId: user._id,
    telegramId,
    shopName,
    description,
    phone,
    status: "pending",
  });

  return { alreadyApplied: false, seller };
}

// Telegram ID orqali sotuvchini topish
async function getSellerByTelegramId(telegramId) {
  const seller = await Seller.findOne({ telegramId });
  return seller;
}

// Sotuvchi statusini yangilash (admin tomonidan)
async function updateSellerStatus(sellerId, status, rejectReason = "") {
  const seller = await Seller.findByIdAndUpdate(
    sellerId,
    { status, rejectReason },
    { returnDocument: "after" }
  );

  if (!seller) throw new Error("Sotuvchi topilmadi");

  // Agar tasdiqlansa — User rolini seller ga o'zgartirish
  if (status === "active") {
    await User.findOneAndUpdate(
      { telegramId: seller.telegramId },
      { role: "seller", sellerId: seller._id }
    );
  }

  // Agar bloklansa yoki rad etilsa — User rolini buyer ga qaytarish
  if (status === "blocked" || status === "rejected") {
    await User.findOneAndUpdate(
      { telegramId: seller.telegramId },
      { role: "buyer", sellerId: null }
    );
  }

  return seller;
}

// Barcha kutayotgan arizalarni olish
async function getPendingSellers() {
  const sellers = await Seller.find({ status: "pending" }).sort({ createdAt: 1 });
  return sellers;
}

// Barcha sotuvchilarni olish
async function getAllSellers(status = null) {
  const filter = status ? { status } : {};
  const sellers = await Seller.find(filter).sort({ createdAt: -1 });
  return sellers;
}

// Sotuvchini bloklash
async function blockSeller(sellerId) {
  return updateSellerStatus(sellerId, "blocked");
}

// Sotuvchini razblokash
async function unblockSeller(sellerId) {
  return updateSellerStatus(sellerId, "active");
}

// Sotuvchi mahsulotlarini olish
async function getSellerProducts(sellerId) {
  const products = await Product.find({ sellerId }).sort({ createdAt: -1 });
  return products;
}

module.exports = {
  applyForSeller,
  getSellerByTelegramId,
  updateSellerStatus,
  getPendingSellers,
  getAllSellers,
  blockSeller,
  unblockSeller,
  getSellerProducts,
};

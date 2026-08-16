const { Product } = require("../models/Product");

// Kategoriyalar ro'yxati — sabit (keyinchalik DB dan olish mumkin)
const CATEGORIES = [
  { id: "bags", label: "👜 Ayollar sumkalari" },
  { id: "accessories", label: "💍 Aksessuarlar" },
  { id: "clothes", label: "👗 Kiyimlar" },
  { id: "gifts", label: "🎁 Sovg'alar" },
  { id: "other", label: "🛍 Boshqa" },
];

// Barcha kategoriyalarni qaytarish
function getCategories() {
  return CATEGORIES;
}

// Kategoriya label'ini ID orqali topish
function getCategoryLabel(categoryId) {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  return category ? category.label : categoryId;
}

// Kategoriya bo'yicha faol mahsulotlarni olish
async function getProductsByCategory(categoryId) {
  const products = await Product.find({
    category: categoryId,
    isActive: true,
    stock: { $gt: 0 },
  }).sort({ createdAt: -1 });

  return products;
}

// ID bo'yicha bitta mahsulotni olish
async function getProductById(productId) {
  const product = await Product.findById(productId);
  return product;
}

// Narxni formatlash: 350000 → "350 000 so'm"
function formatPrice(price) {
  return price.toLocaleString("uz-UZ") + " so'm";
}

module.exports = {
  getCategories,
  getCategoryLabel,
  getProductsByCategory,
  getProductById,
  formatPrice,
};

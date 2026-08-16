require("dotenv").config();

const mongoose = require("mongoose");
const { Product } = require("../models/Product");

// Admin Telegram ID ni seller sifatida ishlatamiz (test uchun)
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || "6148355322";

const testProducts = [
  {
    name: "Elegant ayollar sumkasi",
    description: "Yuqori sifatli teri sumka. Ichida 3 ta bo'lim mavjud. Har qanday kiyim bilan mos keladi.",
    category: "bags",
    price: 350000,
    minPrice: 280000,
    stock: 10,
    images: [],
    cargoPrice: 25000,
    deliveryDays: "2-3 ish kuni",
  },
  {
    name: "Klass ko'cha sumkasi",
    description: "Zamonaviy dizayndagi katta hajmli sumka. Kundalik foydalanish uchun ideal.",
    category: "bags",
    price: 220000,
    minPrice: 180000,
    stock: 5,
    images: [],
    cargoPrice: 25000,
    deliveryDays: "2-3 ish kuni",
  },
  {
    name: "Oltin rang bilakuzuk",
    description: "Oltinga o'xshash rangdagi stilish bilakuzuk. Sovg'a uchun ideal.",
    category: "accessories",
    price: 85000,
    minPrice: 65000,
    stock: 20,
    images: [],
    cargoPrice: 15000,
    deliveryDays: "2-3 ish kuni",
  },
  {
    name: "Zanjirli marjon to'plam",
    description: "3 ta marjon va 1 ta bilakuzukdan iborat to'liq to'plam.",
    category: "accessories",
    price: 120000,
    minPrice: 95000,
    stock: 15,
    images: [],
    cargoPrice: 15000,
    deliveryDays: "2-3 ish kuni",
  },
  {
    name: "Yozgi ko'ylak",
    description: "Yengil va nafis material. O'lchami: S, M, L, XL mavjud.",
    category: "clothes",
    price: 180000,
    minPrice: 140000,
    stock: 8,
    images: [],
    cargoPrice: 25000,
    deliveryDays: "2-3 ish kuni",
  },
];

async function seedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("🟢 MongoDB ga ulandi!");

    // Eski mahsulotlarni o'chirish
    await Product.deleteMany({});
    console.log("🗑  Eski mahsulotlar o'chirildi");

    // Dummy sellerId (ObjectId) — test uchun
    const dummySellerId = new mongoose.Types.ObjectId();

    const productsWithDefaults = testProducts.map((p) => ({
      ...p,
      sellerId: dummySellerId,
      sellerTelegramId: Number(ADMIN_TELEGRAM_ID),
      status: "active",   // to'g'ridan-to'g'ri active
      isActive: true,
    }));

    const inserted = await Product.insertMany(productsWithDefaults);
    console.log(`✅ ${inserted.length} ta mahsulot qo'shildi:\n`);

    inserted.forEach((p) => {
      console.log(`  • ${p.name} — ${p.price.toLocaleString()} so'm | status: ${p.status}`);
    });

    await mongoose.disconnect();
    console.log("\n🔌 Ulanish yopildi.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xato:", error.message);
    process.exit(1);
  }
}

seedProducts();

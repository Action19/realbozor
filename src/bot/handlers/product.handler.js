const { Keyboard, InlineKeyboard } = require("grammy");
const { getSellerByTelegramId, getSellerProducts } = require("../../services/seller");
const { Product } = require("../../models/Product");
const { formatPrice } = require("../../services/product");

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

const CATEGORIES = [
  { id: "bags", label: "👜 Sumkalar" },
  { id: "accessories", label: "💍 Aksessuarlar" },
  { id: "clothes", label: "👗 Kiyimlar" },
  { id: "gifts", label: "🎁 Sovg'alar" },
  { id: "other", label: "🛍 Boshqa" },
];

const backKeyboard = new Keyboard().text("🔙 Orqaga").resized();

// ================================
// MAHSULOT QO'SHISH — boshlash
// ================================

async function handleAddProduct(ctx, userState) {
  const telegramId = ctx.from.id;
  const seller = await getSellerByTelegramId(telegramId);

  if (!seller || seller.status !== "active") {
    await ctx.reply("❌ Faqat tasdiqlangan sotuvchilar mahsulot qo'sha oladi.");
    return;
  }

  userState.set(telegramId, { step: "product:name", sellerId: seller._id });

  await ctx.reply(
    `➕ YANGI MAHSULOT QO'SHISH\n\n` +
    `1️⃣ Mahsulot nomini kiriting:\n` +
    `(Masalan: Elegant ayollar sumkasi)`,
    { reply_markup: backKeyboard }
  );
}

// ================================
// MENING MAHSULOTLARIM
// ================================

async function handleMyProducts(ctx, userState) {
  const telegramId = ctx.from.id;
  const seller = await getSellerByTelegramId(telegramId);

  if (!seller || seller.status !== "active") {
    await ctx.reply("❌ Sotuvchi kabinetiga kirish uchun avval ro'yxatdan o'ting.");
    return;
  }

  const products = await getSellerProducts(seller._id);

  if (products.length === 0) {
    await ctx.reply(
      `📋 MENING MAHSULOTLARIM\n\nHali mahsulot qo'shmagansiz.\n\n"➕ Mahsulot qo'shish" tugmasini bosing!`,
      {
        reply_markup: new Keyboard()
          .text("➕ Mahsulot qo'shish")
          .row()
          .text("🔙 Orqaga")
          .resized(),
      }
    );
    return;
  }

  // Mahsulotlar ro'yxati
  const statusEmoji = {
    pending: "⏳",
    active: "✅",
    blocked: "🚫",
    rejected: "❌",
  };

  const keyboard = new InlineKeyboard();
  products.forEach((p) => {
    keyboard
      .text(
        `${statusEmoji[p.status] || "•"} ${p.name} — ${formatPrice(p.price)}`,
        `myprod:${p._id}`
      )
      .row();
  });

  await ctx.reply(
    `📋 MENING MAHSULOTLARIM\n\n` +
    `Jami: ${products.length} ta mahsulot\n\n` +
    `Holat: ✅ Faol  ⏳ Kutilmoqda  🚫 Bloklangan\n\n` +
    `Mahsulotni tanlang:`,
    { reply_markup: keyboard }
  );
}

// ================================
// MAHSULOT DETALI (sotuvchi uchun)
// ================================

async function handleMyProductDetail(ctx) {
  const productId = ctx.match[1];
  const product = await Product.findById(productId);

  if (!product) {
    await ctx.answerCallbackQuery("Mahsulot topilmadi");
    return;
  }

  await ctx.answerCallbackQuery();

  const statusText = {
    pending: "⏳ Admin tekshirayapti",
    active: "✅ Faol — ko'rinmoqda",
    blocked: "🚫 Bloklangan",
    rejected: `❌ Rad etildi: ${product.rejectReason || "sabab yo'q"}`,
  };

  const keyboard = new InlineKeyboard()
    .text("🗑 O'chirish", `myprod:delete:${product._id}`)
    .row()
    .text("🔙 Orqaga", "myprod:back");

  await ctx.reply(
    `📦 ${product.name}\n\n` +
    `💰 Narx: ${formatPrice(product.price)}\n` +
    `🔒 Min narx: ${formatPrice(product.minPrice)}\n` +
    `📦 Ombor: ${product.stock} dona\n` +
    `📂 Kategoriya: ${product.category}\n` +
    `📊 Holat: ${statusText[product.status]}\n\n` +
    `📝 ${product.description || "Tavsif yo'q"}`,
    { reply_markup: keyboard }
  );
}

// ================================
// MAHSULOT O'CHIRISH
// ================================

async function handleDeleteProduct(ctx) {
  const productId = ctx.match[1];
  const telegramId = ctx.from.id;

  const product = await Product.findById(productId);
  if (!product || product.sellerTelegramId !== telegramId) {
    await ctx.answerCallbackQuery("❌ Ruxsat yo'q");
    return;
  }

  await Product.findByIdAndDelete(productId);
  await ctx.answerCallbackQuery("✅ Mahsulot o'chirildi");
  await ctx.reply("✅ Mahsulot muvaffaqiyatli o'chirildi.");
}

// ================================
// MAHSULOT QO'SHISH — matn jarayoni
// ================================

async function handleProductRegistration(ctx, userState, bot) {
  const telegramId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState.get(telegramId);

  if (!state?.step?.startsWith("product:")) return false;

  // 1. Mahsulot nomi
  if (state.step === "product:name") {
    if (text.length < 3) {
      await ctx.reply("❌ Nom juda qisqa.", { reply_markup: backKeyboard });
      return true;
    }
    userState.set(telegramId, { ...state, step: "product:description", name: text });
    await ctx.reply(
      `✅ Nom: "${text}"\n\n2️⃣ Mahsulot tavsifini yozing:\n(Rang, o'lcham, material va h.k.)`,
      { reply_markup: backKeyboard }
    );
    return true;
  }

  // 2. Tavsif
  if (state.step === "product:description") {
    userState.set(telegramId, { ...state, step: "product:category", description: text });

    const keyboard = new Keyboard();
    CATEGORIES.forEach((c) => keyboard.text(c.label).row());
    keyboard.text("🔙 Orqaga");

    await ctx.reply(
      `✅ Tavsif saqlandi.\n\n3️⃣ Kategoriyani tanlang:`,
      { reply_markup: keyboard.resized() }
    );
    return true;
  }

  // 3. Kategoriya
  if (state.step === "product:category") {
    const cat = CATEGORIES.find((c) => c.label === text);
    if (!cat) {
      await ctx.reply("❌ Ro'yxatdan kategoriya tanlang.", { reply_markup: backKeyboard });
      return true;
    }
    userState.set(telegramId, { ...state, step: "product:price", category: cat.id });
    await ctx.reply(
      `✅ Kategoriya: ${text}\n\n4️⃣ Boshlang'ich narxni kiriting (so'mda):\n(Masalan: 350000)`,
      { reply_markup: backKeyboard }
    );
    return true;
  }

  // 4. Narx
  if (state.step === "product:price") {
    const price = parseInt(text.replace(/\s/g, ""));
    if (isNaN(price) || price < 1000) {
      await ctx.reply("❌ Noto'g'ri narx. Raqam kiriting (Masalan: 350000)", { reply_markup: backKeyboard });
      return true;
    }
    userState.set(telegramId, { ...state, step: "product:minPrice", price });
    await ctx.reply(
      `✅ Boshlang'ich narx: ${formatPrice(price)}\n\n` +
      `5️⃣ MINIMAL sotish narxini kiriting:\n` +
      `(Bu narxdan past kelishmaysiz. Xaridor ko'rmaydi)\n` +
      `(Masalan: 280000)`,
      { reply_markup: backKeyboard }
    );
    return true;
  }

  // 5. Minimal narx
  if (state.step === "product:minPrice") {
    const minPrice = parseInt(text.replace(/\s/g, ""));
    if (isNaN(minPrice) || minPrice < 1000) {
      await ctx.reply("❌ Noto'g'ri narx.", { reply_markup: backKeyboard });
      return true;
    }
    if (minPrice >= state.price) {
      await ctx.reply(
        `❌ Minimal narx boshlang'ich narxdan past bo'lishi kerak.\n` +
        `Boshlang'ich: ${formatPrice(state.price)}`,
        { reply_markup: backKeyboard }
      );
      return true;
    }
    userState.set(telegramId, { ...state, step: "product:stock", minPrice });
    await ctx.reply(
      `✅ Minimal narx: ${formatPrice(minPrice)}\n\n6️⃣ Nechta dona bor? (Ombor miqdori):`,
      { reply_markup: backKeyboard }
    );
    return true;
  }

  // 6. Ombor miqdori
  if (state.step === "product:stock") {
    const stock = parseInt(text);
    if (isNaN(stock) || stock < 1) {
      await ctx.reply("❌ Noto'g'ri miqdor. Musbat son kiriting.", { reply_markup: backKeyboard });
      return true;
    }
    userState.set(telegramId, { ...state, step: "product:photo", stock });
    await ctx.reply(
      `✅ Ombor: ${stock} dona\n\n` +
      `7️⃣ Mahsulot rasmini yuboring:\n` +
      `(Yoki "⏭ O'tkazib yuborish" bosing)`,
      {
        reply_markup: new Keyboard()
          .text("⏭ O'tkazib yuborish")
          .row()
          .text("🔙 Orqaga")
          .resized(),
      }
    );
    return true;
  }

  // 7. Rasm o'tkazib yuborish
  if (state.step === "product:photo" && text === "⏭ O'tkazib yuborish") {
    await saveProduct(ctx, userState, bot, []);
    return true;
  }

  return false;
}

// ================================
// RASM YUKLASH
// ================================

async function handleProductPhoto(ctx, userState, bot) {
  const telegramId = ctx.from.id;
  const state = userState.get(telegramId);

  if (state?.step !== "product:photo") return false;

  // Eng katta o'lchamdagi rasmni olish
  const photos = ctx.message.photo;
  const photo = photos[photos.length - 1];
  const fileId = photo.file_id;

  await saveProduct(ctx, userState, bot, [fileId]);
  return true;
}

// ================================
// MAHSULOTNI BAZAGA SAQLASH
// ================================

async function saveProduct(ctx, userState, bot, images) {
  const telegramId = ctx.from.id;
  const state = userState.get(telegramId);

  try {
    const product = await Product.create({
      sellerId: state.sellerId,
      sellerTelegramId: telegramId,
      name: state.name,
      description: state.description,
      category: state.category,
      price: state.price,
      minPrice: state.minPrice,
      stock: state.stock,
      images,
      status: "pending",
      isActive: true,
    });

    userState.delete(telegramId);

    const sellerKeyboard = new Keyboard()
      .text("➕ Mahsulot qo'shish")
      .row()
      .text("📋 Mening mahsulotlarim")
      .row()
      .text("🔙 Orqaga")
      .resized();

    await ctx.reply(
      `✅ MAHSULOT YUBORILDI!\n\n` +
      `📦 ${product.name}\n` +
      `💰 Narx: ${formatPrice(product.price)}\n` +
      `📂 Kategoriya: ${product.category}\n\n` +
      `⏳ Admin tekshirib tasdiqlaydi. Tez orada javob beriladi!`,
      { reply_markup: sellerKeyboard }
    );

    // Adminga xabar
    if (ADMIN_ID) {
      const keyboard = new InlineKeyboard()
        .text("✅ Tasdiqlash", `admin:product:approve:${product._id}`)
        .text("❌ Rad etish", `admin:product:reject:${product._id}`);

      await bot.api.sendMessage(
        ADMIN_ID,
        `🆕 YANGI MAHSULOT TEKSHIRUV\n\n` +
        `📦 ${product.name}\n` +
        `💰 Narx: ${formatPrice(product.price)}\n` +
        `🔒 Min: ${formatPrice(product.minPrice)}\n` +
        `📦 Ombor: ${product.stock} dona\n` +
        `📂 Kategoriya: ${product.category}\n` +
        `📝 ${product.description || "Tavsif yo'q"}\n` +
        `👤 Sotuvchi ID: ${telegramId}`,
        { reply_markup: keyboard }
      );
    }
  } catch (error) {
    console.error("Mahsulot saqlash xatosi:", error);
    await ctx.reply("❌ Xatolik yuz berdi. Qayta urinib ko'ring.");
    userState.delete(telegramId);
  }
}

module.exports = {
  handleAddProduct,
  handleMyProducts,
  handleMyProductDetail,
  handleDeleteProduct,
  handleProductRegistration,
  handleProductPhoto,
};

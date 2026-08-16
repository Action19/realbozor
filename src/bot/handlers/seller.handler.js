const { Keyboard, InlineKeyboard } = require("grammy");
const {
  applyForSeller,
  getSellerByTelegramId,
  getSellerProducts,
} = require("../../services/seller");
const { getUserByTelegramId } = require("../../services/user");
const { formatPrice } = require("../../services/product");

// Admin Telegram ID — .env dan olinadi
const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

const mainKeyboard = new Keyboard()
  .text("🛍 Katalog").text("🛒 Savatcha")
  .row()
  .text("📦 Buyurtmalarim").text("👤 Profilim")
  .row()
  .text("🏪 Sotuvchi bo'lish")
  .resized();

const backKeyboard = new Keyboard().text("🔙 Orqaga").resized();

// ================================
// SOTUVCHI BO'LISH TUGMASI
// ================================

async function handleBecomeSeller(ctx, userState) {
  const telegramId = ctx.from.id;
  const user = await getUserByTelegramId(telegramId);

  // Bloklangan foydalanuvchi
  if (user?.isBlocked) {
    await ctx.reply("❌ Sizning hisobingiz bloklangan.");
    return;
  }

  // Allaqachon sotuvchi
  if (user?.role === "seller") {
    await handleSellerCabinet(ctx, userState);
    return;
  }

  // Ariza holati tekshirish
  const seller = await getSellerByTelegramId(telegramId);

  if (seller?.status === "pending") {
    await ctx.reply(
      `⏳ ARIZANGIZ KO'RIB CHIQILMOQDA\n\n` +
      `Do'kon nomi: ${seller.shopName}\n` +
      `Holat: Kutilmoqda...\n\n` +
      `Admin tez orada ko'rib chiqadi. Sabr qiling! 🙏`,
      { reply_markup: new Keyboard().text("🔙 Orqaga").resized() }
    );
    return;
  }

  if (seller?.status === "rejected") {
    await ctx.reply(
      `❌ ARIZANGIZ RAD ETILDI\n\n` +
      `Sabab: ${seller.rejectReason || "Ko'rsatilmagan"}\n\n` +
      `Qayta ariza berishingiz mumkin.`,
      {
        reply_markup: new InlineKeyboard().text(
          "🔄 Qayta ariza berish",
          "seller:reapply"
        ),
      }
    );
    return;
  }

  if (seller?.status === "blocked") {
    await ctx.reply("❌ Sizning sotuvchi hisobingiz bloklangan. Admin bilan bog'laning.");
    return;
  }

  // Yangi ariza jarayonini boshlash
  userState.set(telegramId, "seller:shopName");

  await ctx.reply(
    `🏪 SOTUVCHI BO'LISH\n\n` +
    `RealBozor'da o'z do'koningizni oching!\n\n` +
    `✅ Mahsulotlaringizni joylashtiring\n` +
    `✅ Xaridorlar bilan savdolashing\n` +
    `✅ Daromad qiling\n\n` +
    `Do'koningiz nomini kiriting:\n` +
    `(Masalan: Zulfiya Fashion, Style House)`,
    { reply_markup: backKeyboard }
  );
}

// ================================
// SOTUVCHI KABINETI
// ================================

async function handleSellerCabinet(ctx, userState) {
  const telegramId = ctx.from.id;
  const seller = await getSellerByTelegramId(telegramId);

  if (!seller || seller.status !== "active") {
    await ctx.reply("❌ Sotuvchi kabinetiga kirish uchun avval ro'yxatdan o'ting.");
    return;
  }

  const products = await getSellerProducts(seller._id);
  const activeProducts = products.filter((p) => p.status === "active").length;
  const pendingProducts = products.filter((p) => p.status === "pending").length;

  const keyboard = new Keyboard()
    .text("➕ Mahsulot qo'shish")
    .row()
    .text("📋 Mening mahsulotlarim")
    .row()
    .text("📊 Statistika")
    .row()
    .text("🔙 Orqaga")
    .resized();

  await ctx.reply(
    `🏪 SOTUVCHI KABINETI\n\n` +
    `Do'kon: ${seller.shopName}\n` +
    `Holat: ✅ Faol\n\n` +
    `📦 Mahsulotlar: ${products.length} ta\n` +
    `✅ Faol: ${activeProducts} ta\n` +
    `⏳ Kutilmoqda: ${pendingProducts} ta\n\n` +
    `Nima qilmoqchisiz?`,
    { reply_markup: keyboard }
  );
}

// ================================
// SOTUVCHI ARIZA JARAYONI — matn xabarlar
// ================================

async function handleSellerRegistration(ctx, userState, bot) {
  const telegramId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState.get(telegramId);

  // Do'kon nomini saqlash
  if (state === "seller:shopName") {
    if (text.length < 3) {
      await ctx.reply("❌ Do'kon nomi juda qisqa. Kamida 3 ta harf.", { reply_markup: backKeyboard });
      return true;
    }

    userState.set(telegramId, { step: "seller:phone", shopName: text });
    await ctx.reply(
      `✅ Do'kon nomi: "${text}"\n\n` +
      `📱 Endi telefon raqamingizni kiriting:\n` +
      `(Masalan: +998901234567)`,
      { reply_markup: backKeyboard }
    );
    return true;
  }

  // Telefon saqlash
  if (state?.step === "seller:phone") {
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(text.replace(/\s/g, ""))) {
      await ctx.reply("❌ Noto'g'ri telefon raqam.\n\nMasalan: +998901234567", { reply_markup: backKeyboard });
      return true;
    }

    userState.set(telegramId, { ...state, step: "seller:description", phone: text });
    await ctx.reply(
      `✅ Telefon: ${text}\n\n` +
      `📝 Do'koningiz haqida qisqacha yozing:\n` +
      `(Nima sotasiz? Qayerdasiz?)`,
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

  // Tavsif saqlash va ariza yuborish
  if (state?.step === "seller:description") {
    const description = text === "⏭ O'tkazib yuborish" ? "" : text;

    try {
      const { alreadyApplied, seller } = await applyForSeller(telegramId, {
        shopName: state.shopName,
        phone: state.phone,
        description,
      });

      userState.delete(telegramId);

      if (alreadyApplied) {
        await ctx.reply("⚠️ Siz allaqachon ariza bergansiz.", { reply_markup: mainKeyboard });
        return true;
      }

      // Foydalanuvchiga xabar
      await ctx.reply(
        `✅ ARIZA YUBORILDI!\n\n` +
        `🏪 Do'kon nomi: ${seller.shopName}\n` +
        `📱 Telefon: ${seller.phone}\n\n` +
        `Admin ko'rib chiqadi va tez orada javob beradi.\n` +
        `Odatda 24 soat ichida javob beriladi.`,
        { reply_markup: mainKeyboard }
      );

      // Adminga xabar yuborish
      if (ADMIN_ID) {
        const keyboard = new InlineKeyboard()
          .text("✅ Tasdiqlash", `admin:seller:approve:${seller._id}`)
          .text("❌ Rad etish", `admin:seller:reject:${seller._id}`);

        await bot.api.sendMessage(
          ADMIN_ID,
          `🆕 YANGI SOTUVCHI ARIZASI\n\n` +
          `🏪 Do'kon: ${seller.shopName}\n` +
          `📱 Telefon: ${seller.phone}\n` +
          `📝 Tavsif: ${seller.description || "Yo'q"}\n` +
          `👤 Telegram ID: ${telegramId}\n` +
          `📅 Sana: ${new Date().toLocaleDateString("uz-UZ")}`,
          { reply_markup: keyboard }
        );
      }
    } catch (error) {
      await ctx.reply("❌ Xatolik yuz berdi. Qayta urinib ko'ring.", { reply_markup: mainKeyboard });
    }

    return true;
  }

  return false;
}

module.exports = {
  handleBecomeSeller,
  handleSellerCabinet,
  handleSellerRegistration,
  mainKeyboard,
};

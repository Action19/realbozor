require("dotenv").config();

const { Bot, Keyboard, InlineKeyboard } = require("grammy");
const {
  createOrUpdateUser,
  getUserByTelegramId,
  saveUserPhone,
  saveUserAddress,
} = require("../services/user");
const {
  getCategories,
  getCategoryLabel,
  getProductsByCategory,
  getProductById,
  formatPrice,
} = require("../services/product");

// ================================
// 1. BOT TOKENINI OLISH
// ================================

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error("BOT_TOKEN topilmadi. .env faylini tekshiring.");
}

// ================================
// 2. BOTNI YARATISH
// ================================

const bot = new Bot(token);

// ================================
// 3. FOYDALANUVCHI HOLATI
// ================================

const userState = new Map();

// ================================
// 4. KLAVIATURALAR
// ================================

const mainKeyboard = new Keyboard()
  .text("🛍 Katalog").text("🛒 Savatcha")
  .row()
  .text("📦 Buyurtmalarim").text("👤 Profilim")
  .resized();

const profileKeyboard = new Keyboard()
  .text("📱 Telefon raqam kiritish")
  .row()
  .text("📍 Manzil kiritish")
  .row()
  .text("🔙 Orqaga")
  .resized();

const backKeyboard = new Keyboard()
  .text("🔙 Orqaga")
  .resized();

// ================================
// 5. /START
// ================================

bot.command("start", async (ctx) => {
  const firstName = ctx.from.first_name;

  await createOrUpdateUser(ctx.from);
  userState.delete(ctx.from.id);

  await ctx.reply(
    `🛍 REALBOZOR\nBozordagidek savdolash!\n\nAssalomu alaykum, ${firstName}! 👋\n\nRealBozorga xush kelibsiz.\n\nBu yerda siz:\n• mahsulotlarni ko'rishingiz\n• sotuvchi bilan savdolashishingiz\n• kelishilgan narxda xarid qilishingiz\n• buyurtmangizni kuzatishingiz mumkin.\n\nKerakli bo'limni tanlang 👇`,
    { reply_markup: mainKeyboard }
  );
});

// ================================
// 6. KATALOG — Mini App ochiladi
// ================================

bot.hears("🛍 Katalog", async (ctx) => {
  userState.delete(ctx.from.id);

  const miniAppUrl = process.env.MINI_APP_URL;

  // Mini App URL sozlanmagan bo'lsa — eski inline klaviatura
  if (!miniAppUrl || miniAppUrl.includes("netlify.app") === false) {
    const categories = getCategories();
    const keyboard = new InlineKeyboard();
    categories.forEach((cat) => {
      keyboard.text(cat.label, `category:${cat.id}`).row();
    });
    await ctx.reply(
      `🛍 KATALOG\n\nQaysi kategoriyani ko'rmoqchisiz?`,
      { reply_markup: keyboard }
    );
    return;
  }

  // Mini App WebApp tugmasi
  const keyboard = new InlineKeyboard().webApp(
    "🛍 RealBozor Katalogni ochish",
    miniAppUrl
  );

  await ctx.reply(
    `🛍 REALBOZOR KATALOG\n\nTo'liq marketplace ni ochish uchun quyidagi tugmani bosing:\n\n• Mahsulotlar rasmlari\n• Narxlar\n• Kategoriyalar\n• Qidiruv\n• 🤝 Sotuvchi bilan savdolashish`,
    { reply_markup: keyboard }
  );
});

// ================================
// 7. KATEGORIYA TANLANDI — mahsulotlar ro'yxati
// ================================

bot.callbackQuery(/^category:(.+)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  const categoryLabel = getCategoryLabel(categoryId);

  await ctx.answerCallbackQuery();

  const products = await getProductsByCategory(categoryId);

  if (products.length === 0) {
    await ctx.reply(
      `${categoryLabel}\n\nBu kategoriyada hozircha mahsulotlar mavjud emas.\n\nTez orada yangi mahsulotlar qo'shiladi! 🔜`,
      { reply_markup: mainKeyboard }
    );
    return;
  }

  // Har bir mahsulot uchun inline tugma
  const keyboard = new InlineKeyboard();
  products.forEach((product) => {
    keyboard
      .text(
        `${product.name} — ${formatPrice(product.price)}`,
        `product:${product._id}`
      )
      .row();
  });
  keyboard.text("🔙 Kategoriyalarga qaytish", "back:catalog");

  await ctx.reply(
    `${categoryLabel}\n\n📦 ${products.length} ta mahsulot topildi:\n\nBiror mahsulotni tanlang 👇`,
    { reply_markup: keyboard }
  );
});

// ================================
// 8. MAHSULOT TANLANDI — to'liq sahifa
// ================================

bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
  const productId = ctx.match[1];

  await ctx.answerCallbackQuery();

  const product = await getProductById(productId);

  if (!product) {
    await ctx.reply("❌ Mahsulot topilmadi.");
    return;
  }

  // Mahsulot ma'lumotlari
  const categoryLabel = getCategoryLabel(product.category);
  const stockText = product.stock > 0
    ? `✅ Mavjud (${product.stock} dona)`
    : "❌ Sotib bo'lindi";

  const text =
    `${product.name}\n\n` +
    `📂 Kategoriya: ${categoryLabel}\n` +
    `💰 Narx: ${formatPrice(product.price)}\n` +
    `📦 Holat: ${stockText}\n` +
    `🚚 Kargo: ${formatPrice(product.cargoPrice)}\n` +
    `⏱ Yetkazish: ${product.deliveryDays}\n\n` +
    `📝 ${product.description || "Tavsif mavjud emas"}`;

  // Mahsulot tugmalari
  const keyboard = new InlineKeyboard()
    .text("🤝 Savdolashish", `negotiate:${product._id}`)
    .row()
    .text("🛒 Savatchaga qo'shish", `cart:${product._id}`)
    .row()
    .text("🔙 Orqaga", `category:${product.category}`);

  // Rasm bor bo'lsa — rasm bilan, yo'q bo'lsa — faqat matn
  if (product.images && product.images.length > 0) {
    await ctx.replyWithPhoto(product.images[0], {
      caption: text,
      reply_markup: keyboard,
    });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
});

// ================================
// 9. KATALOGGA QAYTISH
// ================================

bot.callbackQuery("back:catalog", async (ctx) => {
  await ctx.answerCallbackQuery();

  const categories = getCategories();
  const keyboard = new InlineKeyboard();
  categories.forEach((cat) => {
    keyboard.text(cat.label, `category:${cat.id}`).row();
  });

  await ctx.reply(
    `🛍 KATALOG\n\nQaysi kategoriyani ko'rmoqchisiz?`,
    { reply_markup: keyboard }
  );
});

// ================================
// 10. SAVDOLASHISH — keyingi bosqichda
// ================================

bot.callbackQuery(/^negotiate:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `🤝 Savdolashish funksiyasi tez orada qo'shiladi!\n\nHozircha kutib turing.`
  );
});

// Mini App dan kelgan savdolashish so'rovi (tg.sendData orqali)
bot.on("message:web_app_data", async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);

    if (data.action === "negotiate") {
      await ctx.reply(
        `🤝 Savdolashish boshlandi!\n\n` +
        `📦 Mahsulot: ${data.productName}\n\n` +
        `AI sotuvchi tez orada qo'shiladi. Kutib turing! 🔜`,
        { reply_markup: mainKeyboard }
      );
    }
  } catch (err) {
    console.error("web_app_data xatosi:", err);
  }
});

// ================================
// 11. SAVATCHAGA QO'SHISH — keyingi bosqichda
// ================================

bot.callbackQuery(/^cart:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(
    `🛒 Savatcha funksiyasi tez orada qo'shiladi!`
  );
});

// ================================
// 12. SAVATCHA
// ================================

bot.hears("🛒 Savatcha", async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply(`🛒 SAVATCHA\n\nSavatchangiz hozircha bo'sh.`);
});

// ================================
// 13. BUYURTMALAR
// ================================

bot.hears("📦 Buyurtmalarim", async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply(`📦 BUYURTMALARIM\n\nSizda hozircha buyurtmalar mavjud emas.`);
});

// ================================
// 14. PROFIL
// ================================

bot.hears("👤 Profilim", async (ctx) => {
  userState.delete(ctx.from.id);
  const user = await getUserByTelegramId(ctx.from.id);

  if (!user) {
    await ctx.reply("Xatolik yuz berdi. Iltimos /start bosing.");
    return;
  }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const phoneText = user.phone || "❗ Kiritilmagan";
  const addressText = user.address || "❗ Kiritilmagan";
  const usernameText = user.username ? `@${user.username}` : "yo'q";

  await ctx.reply(
    `👤 PROFILIM\n\n` +
    `Ism: ${fullName}\n` +
    `Username: ${usernameText}\n` +
    `Telefon: ${phoneText}\n` +
    `Manzil: ${addressText}\n\n` +
    `🗓 Ro'yxatdan o'tgan: ${user.createdAt.toLocaleDateString("uz-UZ")}`,
    { reply_markup: profileKeyboard }
  );
});

// ================================
// 15. TELEFON RAQAM KIRITISH
// ================================

bot.hears("📱 Telefon raqam kiritish", async (ctx) => {
  userState.set(ctx.from.id, "phone");
  await ctx.reply(
    `📱 Telefon raqamingizni kiriting.\n\nMasalan: +998901234567`,
    { reply_markup: backKeyboard }
  );
});

// ================================
// 16. MANZIL KIRITISH
// ================================

bot.hears("📍 Manzil kiritish", async (ctx) => {
  userState.set(ctx.from.id, "address");
  await ctx.reply(
    `📍 Yetkazib berish manzilingizni kiriting.\n\nMasalan:\nToshkent shahri, Chilonzor tumani,\nBunyodkor ko'chasi, 12-uy`,
    { reply_markup: backKeyboard }
  );
});

// ================================
// 17. ORQAGA
// ================================

bot.hears("🔙 Orqaga", async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply("Asosiy menyu 👇", { reply_markup: mainKeyboard });
});

// ================================
// 18. MATN XABARLARI — holat bo'yicha
// ================================

bot.on("message:text", async (ctx) => {
  const telegramId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState.get(telegramId);

  if (!state) {
    await ctx.reply("Kerakli bo'limni tanlang 👇", { reply_markup: mainKeyboard });
    return;
  }

  // Telefon saqlash
  if (state === "phone") {
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(text.replace(/\s/g, ""))) {
      await ctx.reply(
        `❌ Noto'g'ri format.\n\nMasalan: +998901234567`,
        { reply_markup: backKeyboard }
      );
      return;
    }

    await saveUserPhone(telegramId, text);
    userState.delete(telegramId);

    await ctx.reply(
      `✅ Telefon raqam saqlandi: ${text}\n\nProfilga qaytish uchun tugmani bosing.`,
      { reply_markup: profileKeyboard }
    );
    return;
  }

  // Manzil saqlash
  if (state === "address") {
    if (text.length < 10) {
      await ctx.reply(
        `❌ Manzil juda qisqa. Aniqroq yozing.\n\nMasalan:\nToshkent shahri, Chilonzor tumani, 12-uy`,
        { reply_markup: backKeyboard }
      );
      return;
    }

    await saveUserAddress(telegramId, text);
    userState.delete(telegramId);

    await ctx.reply(
      `✅ Manzil saqlandi!\n\n📍 ${text}\n\nProfilga qaytish uchun tugmani bosing.`,
      { reply_markup: profileKeyboard }
    );
    return;
  }
});

// ================================
// 19. BOTNI ISHGA TUSHIRISH
// main.js dan chaqirilganda database allaqachon ulangan bo'ladi
// ================================

bot.start({
  onStart: (info) => {
    console.log(`🟢 RealBozor bot ishga tushdi: @${info.username}`);
  },
});

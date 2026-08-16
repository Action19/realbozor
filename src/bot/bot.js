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
const {
  handleBecomeSeller,
  handleSellerCabinet,
  handleSellerRegistration,
  mainKeyboard,
} = require("./handlers/seller.handler");
const {
  handleAddProduct,
  handleMyProducts,
  handleMyProductDetail,
  handleDeleteProduct,
  handleProductRegistration,
  handleProductPhoto,
} = require("./handlers/product.handler");
const {
  isAdmin,
  handleAdminPanel,
  handleAdminUsers,
  handleAdminUserDetail,
  handleAdminSellers,
  handleAdminSellerDetail,
  handleAdminPending,
  handleAdminProducts,
  handleAdminProductDetail,
  handleAdminCallbacks,
} = require("./handlers/admin.handler");

// ================================
// BOT YARATISH
// ================================

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN topilmadi.");

const bot = new Bot(token);

// ================================
// FOYDALANUVCHI HOLATI
// ================================

const userState = new Map();

// ================================
// KLAVIATURALAR
// ================================

const profileKeyboard = new Keyboard()
  .text("📱 Telefon raqam kiritish")
  .row()
  .text("📍 Manzil kiritish")
  .row()
  .text("🔙 Orqaga")
  .resized();

const backKeyboard = new Keyboard().text("🔙 Orqaga").resized();

// ================================
// /START
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

// /admin buyrug'i
bot.command("admin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  userState.delete(ctx.from.id);
  await handleAdminPanel(ctx);
});

// ================================
// KATALOG — Mini App
// ================================

bot.hears("🛍 Katalog", async (ctx) => {
  userState.delete(ctx.from.id);

  const miniAppUrl = process.env.MINI_APP_URL;
  if (miniAppUrl) {
    const keyboard = new InlineKeyboard().webApp("🛍 RealBozor Katalogni ochish", miniAppUrl);
    await ctx.reply(
      `🛍 REALBOZOR KATALOG\n\nTo'liq marketplace ni ochish uchun tugmani bosing:`,
      { reply_markup: keyboard }
    );
  } else {
    const categories = getCategories();
    const keyboard = new InlineKeyboard();
    categories.forEach((cat) => keyboard.text(cat.label, `category:${cat.id}`).row());
    await ctx.reply(`🛍 KATALOG\n\nKategoriyani tanlang:`, { reply_markup: keyboard });
  }
});

// ================================
// SAVATCHA
// ================================

bot.hears("🛒 Savatcha", async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply(`🛒 SAVATCHA\n\nSavatchangiz hozircha bo'sh.`);
});

// ================================
// BUYURTMALAR
// ================================

bot.hears("📦 Buyurtmalarim", async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply(`📦 BUYURTMALARIM\n\nSizda hozircha buyurtmalar mavjud emas.`);
});

// ================================
// PROFIL
// ================================

bot.hears("👤 Profilim", async (ctx) => {
  userState.delete(ctx.from.id);
  const user = await getUserByTelegramId(ctx.from.id);
  if (!user) { await ctx.reply("Xatolik. /start bosing."); return; }

  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const phoneText = user.phone || "❗ Kiritilmagan";
  const addressText = user.address || "❗ Kiritilmagan";
  const usernameText = user.username ? `@${user.username}` : "yo'q";
  const roleText = { buyer: "👤 Xaridor", seller: "🏪 Sotuvchi", admin: "⚙️ Admin" };

  await ctx.reply(
    `👤 PROFILIM\n\n` +
    `Ism: ${fullName}\n` +
    `Username: ${usernameText}\n` +
    `Telefon: ${phoneText}\n` +
    `Manzil: ${addressText}\n` +
    `Rol: ${roleText[user.role] || user.role}\n` +
    `🆔 Telegram ID: ${user.telegramId}\n\n` +
    `🗓 Ro'yxatdan o'tgan: ${user.createdAt.toLocaleDateString("uz-UZ")}`,
    { reply_markup: profileKeyboard }
  );
});

// ================================
// SOTUVCHI BO'LISH
// ================================

bot.hears("🏪 Sotuvchi bo'lish", async (ctx) => {
  userState.delete(ctx.from.id);
  await handleBecomeSeller(ctx, userState);
});

// Sotuvchi kabineti tugmalari
bot.hears("➕ Mahsulot qo'shish", async (ctx) => {
  await handleAddProduct(ctx, userState);
});

bot.hears("📋 Mening mahsulotlarim", async (ctx) => {
  await handleMyProducts(ctx, userState);
});

bot.hears("📊 Statistika", async (ctx) => {
  await ctx.reply("📊 Statistika tez orada qo'shiladi!");
});

// ================================
// ADMIN PANEL TUGMALARI
// ================================

bot.hears("👥 Foydalanuvchilar", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await handleAdminUsers(ctx);
});

bot.hears("🏪 Sotuvchilar", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await handleAdminSellers(ctx);
});

bot.hears("📦 Mahsulotlar", async (ctx) => {
  if (!isAdmin(ctx.from.id)) {
    userState.delete(ctx.from.id);
    await ctx.reply(`📦 BUYURTMALARIM\n\nSizda hozircha buyurtmalar mavjud emas.`);
    return;
  }
  await handleAdminProducts(ctx);
});

bot.hears("⏳ Kutilmoqda", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return;
  await handleAdminPending(ctx);
});

// ================================
// PROFIL TUGMALARI
// ================================

bot.hears("📱 Telefon raqam kiritish", async (ctx) => {
  userState.set(ctx.from.id, "phone");
  await ctx.reply(`📱 Telefon raqamingizni kiriting.\n\nMasalan: +998901234567`, { reply_markup: backKeyboard });
});

bot.hears("📍 Manzil kiritish", async (ctx) => {
  userState.set(ctx.from.id, "address");
  await ctx.reply(
    `📍 Yetkazib berish manzilingizni kiriting.\n\nMasalan:\nToshkent shahri, Chilonzor tumani,\nBunyodkor ko'chasi, 12-uy`,
    { reply_markup: backKeyboard }
  );
});

bot.hears("🔙 Orqaga", async (ctx) => {
  userState.delete(ctx.from.id);
  await ctx.reply("Asosiy menyu 👇", { reply_markup: mainKeyboard });
});

// ================================
// INLINE CALLBACK QUERYLAR
// ================================

// Katalog kategoriya
bot.callbackQuery(/^category:(.+)$/, async (ctx) => {
  const categoryId = ctx.match[1];
  const categoryLabel = getCategoryLabel(categoryId);
  await ctx.answerCallbackQuery();
  const products = await getProductsByCategory(categoryId);

  if (products.length === 0) {
    await ctx.reply(`${categoryLabel}\n\nBu kategoriyada mahsulotlar yo'q.`, { reply_markup: mainKeyboard });
    return;
  }

  const keyboard = new InlineKeyboard();
  products.forEach((p) => keyboard.text(`${p.name} — ${formatPrice(p.price)}`, `product:${p._id}`).row());
  keyboard.text("🔙 Kategoriyalarga", "back:catalog");
  await ctx.reply(`${categoryLabel}\n\n${products.length} ta mahsulot:`, { reply_markup: keyboard });
});

// Mahsulot sahifasi
bot.callbackQuery(/^product:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const product = await getProductById(ctx.match[1]);
  if (!product) { await ctx.reply("❌ Mahsulot topilmadi."); return; }

  const text =
    `${product.name}\n\n` +
    `📂 ${getCategoryLabel(product.category)}\n` +
    `💰 Narx: ${formatPrice(product.price)}\n` +
    `📦 Holat: ${product.stock > 0 ? `✅ Mavjud (${product.stock} dona)` : "❌ Sotib bo'lindi"}\n` +
    `🚚 Kargo: ${formatPrice(product.cargoPrice)}\n` +
    `⏱ Yetkazish: ${product.deliveryDays}\n\n` +
    `📝 ${product.description || "Tavsif yo'q"}`;

  const keyboard = new InlineKeyboard()
    .text("🤝 Savdolashish", `negotiate:${product._id}`)
    .row()
    .text("🛒 Savatchaga", `cart:${product._id}`)
    .row()
    .text("🔙 Orqaga", `category:${product.category}`);

  if (product.images?.length > 0) {
    await ctx.replyWithPhoto(product.images[0], { caption: text, reply_markup: keyboard });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
});

// Katalogga qaytish
bot.callbackQuery("back:catalog", async (ctx) => {
  await ctx.answerCallbackQuery();
  const categories = getCategories();
  const keyboard = new InlineKeyboard();
  categories.forEach((cat) => keyboard.text(cat.label, `category:${cat.id}`).row());
  await ctx.reply(`🛍 KATALOG\n\nKategoriyani tanlang:`, { reply_markup: keyboard });
});

// Savdolashish (bot chat)
bot.callbackQuery(/^negotiate:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(`🤝 Savdolashish funksiyasi tez orada!\n\nHozircha kutib turing.`);
});

bot.callbackQuery(/^cart:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply(`🛒 Savatcha funksiyasi tez orada!`);
});

// Sotuvchi mahsulot detail
bot.callbackQuery(/^myprod:(.+)$/, async (ctx) => {
  const data = ctx.match[1];
  if (data.startsWith("delete:")) {
    ctx.match = [null, data.replace("delete:", "")];
    await handleDeleteProduct(ctx);
  } else if (data === "back") {
    await ctx.answerCallbackQuery();
    await handleMyProducts(ctx, userState);
  } else {
    ctx.match = [null, data];
    await handleMyProductDetail(ctx);
  }
});

// Admin callbacklar
bot.callbackQuery(/^admin:/, async (ctx) => {
  await handleAdminCallbacks(ctx, bot);
});

// Admin foydalanuvchi detail
bot.callbackQuery(/^admin:user:(\d+)$/, async (ctx) => {
  await handleAdminUserDetail(ctx);
});

// Admin sotuvchi detail
bot.callbackQuery(/^admin:seller:detail:(.+)$/, async (ctx) => {
  await handleAdminSellerDetail(ctx);
});

// Admin mahsulot detail
bot.callbackQuery(/^admin:product:detail:(.+)$/, async (ctx) => {
  await handleAdminProductDetail(ctx);
});

// ================================
// MINI APP DAN KELGAN MA'LUMOT
// ================================

bot.on("message:web_app_data", async (ctx) => {
  try {
    const data = JSON.parse(ctx.message.web_app_data.data);
    if (data.action === "negotiate") {
      await ctx.reply(
        `🤝 Savdolashish boshlandi!\n\n📦 ${data.productName}\n\nAI sotuvchi tez orada qo'shiladi!`,
        { reply_markup: mainKeyboard }
      );
    }
  } catch (err) {
    console.error("web_app_data xatosi:", err);
  }
});

// ================================
// RASM XABARLARI
// ================================

bot.on("message:photo", async (ctx) => {
  const handled = await handleProductPhoto(ctx, userState, bot);
  if (!handled) {
    await ctx.reply("Kerakli bo'limni tanlang 👇", { reply_markup: mainKeyboard });
  }
});

// ================================
// MATN XABARLARI
// ================================

bot.on("message:text", async (ctx) => {
  const telegramId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState.get(telegramId);

  if (!state) {
    await ctx.reply("Kerakli bo'limni tanlang 👇", { reply_markup: mainKeyboard });
    return;
  }

  // Orqaga tugmasi
  if (text === "🔙 Orqaga") {
    userState.delete(telegramId);
    await ctx.reply("Asosiy menyu 👇", { reply_markup: mainKeyboard });
    return;
  }

  // Telefon saqlash
  if (state === "phone") {
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(text.replace(/\s/g, ""))) {
      await ctx.reply(`❌ Noto'g'ri format.\n\nMasalan: +998901234567`, { reply_markup: backKeyboard });
      return;
    }
    await saveUserPhone(telegramId, text);
    userState.delete(telegramId);
    await ctx.reply(`✅ Telefon raqam saqlandi: ${text}`, { reply_markup: profileKeyboard });
    return;
  }

  // Manzil saqlash
  if (state === "address") {
    if (text.length < 10) {
      await ctx.reply(`❌ Manzil juda qisqa. Aniqroq yozing.`, { reply_markup: backKeyboard });
      return;
    }
    await saveUserAddress(telegramId, text);
    userState.delete(telegramId);
    await ctx.reply(`✅ Manzil saqlandi!\n\n📍 ${text}`, { reply_markup: profileKeyboard });
    return;
  }

  // Sotuvchi ro'yxatdan o'tish
  const sellerHandled = await handleSellerRegistration(ctx, userState, bot);
  if (sellerHandled) return;

  // Mahsulot qo'shish
  const productHandled = await handleProductRegistration(ctx, userState, bot);
  if (productHandled) return;

  await ctx.reply("Kerakli bo'limni tanlang 👇", { reply_markup: mainKeyboard });
});

// ================================
// BOT ISHGA TUSHIRISH
// ================================

bot.start({
  onStart: (info) => {
    console.log(`🟢 RealBozor bot ishga tushdi: @${info.username}`);
  },
});

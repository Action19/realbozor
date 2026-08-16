const { InlineKeyboard, Keyboard } = require("grammy");
const {
  getPendingSellers,
  getAllSellers,
  updateSellerStatus,
  blockSeller,
  unblockSeller,
} = require("../../services/seller");
const { User } = require("../../models/User");
const { Product } = require("../../models/Product");
const { formatPrice } = require("../../services/product");

const ADMIN_ID = process.env.ADMIN_TELEGRAM_ID;

// Admin ekanligini tekshirish
function isAdmin(telegramId) {
  return String(telegramId) === String(ADMIN_ID);
}

// ================================
// ADMIN PANEL BOSH SAHIFA
// ================================

async function handleAdminPanel(ctx) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.reply("❌ Sizda admin huquqi yo'q.");
    return;
  }

  const [totalUsers, totalSellers, totalProducts, pendingSellers, pendingProducts] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "seller" }),
      Product.countDocuments({ status: "active" }),
      User.countDocuments({ role: "buyer", sellerId: null }).then(() =>
        require("../../models/Seller").Seller.countDocuments({ status: "pending" })
      ),
      Product.countDocuments({ status: "pending" }),
    ]);

  const keyboard = new Keyboard()
    .text("👥 Foydalanuvchilar").text("🏪 Sotuvchilar")
    .row()
    .text("📦 Mahsulotlar").text("⏳ Kutilmoqda")
    .row()
    .text("🔙 Orqaga")
    .resized();

  await ctx.reply(
    `⚙️ ADMIN PANEL\n\n` +
    `👥 Foydalanuvchilar: ${totalUsers} ta\n` +
    `🏪 Sotuvchilar: ${totalSellers} ta\n` +
    `📦 Faol mahsulotlar: ${totalProducts} ta\n\n` +
    `⏳ Kutilayotgan arizalar: ${pendingSellers} ta\n` +
    `⏳ Kutilayotgan mahsulotlar: ${pendingProducts} ta`,
    { reply_markup: keyboard }
  );
}

// ================================
// FOYDALANUVCHILAR RO'YXATI
// ================================

async function handleAdminUsers(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const users = await User.find().sort({ createdAt: -1 }).limit(20);

  if (users.length === 0) {
    await ctx.reply("Foydalanuvchilar yo'q.");
    return;
  }

  const keyboard = new InlineKeyboard();
  users.forEach((u) => {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    const roleEmoji = { buyer: "👤", seller: "🏪", admin: "⚙️" };
    const blocked = u.isBlocked ? "🚫" : "";
    keyboard
      .text(
        `${roleEmoji[u.role]} ${blocked} ${name} (@${u.username || "—"})`,
        `admin:user:${u.telegramId}`
      )
      .row();
  });

  await ctx.reply(
    `👥 FOYDALANUVCHILAR (oxirgi 20 ta)\n\nBirini tanlang:`,
    { reply_markup: keyboard }
  );
}

// ================================
// FOYDALANUVCHI DETAIL
// ================================

async function handleAdminUserDetail(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const telegramId = Number(ctx.match[1]);
  const user = await User.findOne({ telegramId });

  if (!user) {
    await ctx.answerCallbackQuery("Topilmadi");
    return;
  }

  await ctx.answerCallbackQuery();

  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const keyboard = new InlineKeyboard();

  if (user.isBlocked) {
    keyboard.text("✅ Blokdan chiqarish", `admin:user:unblock:${telegramId}`);
  } else {
    keyboard.text("🚫 Bloklash", `admin:user:block:${telegramId}`);
  }
  keyboard.row().text("🔙 Orqaga", "admin:users:back");

  await ctx.reply(
    `👤 FOYDALANUVCHI\n\n` +
    `Ism: ${name}\n` +
    `Username: @${user.username || "—"}\n` +
    `Telegram ID: ${user.telegramId}\n` +
    `Rol: ${user.role}\n` +
    `Telefon: ${user.phone || "—"}\n` +
    `Holat: ${user.isBlocked ? "🚫 Bloklangan" : "✅ Faol"}\n` +
    `Ro'yxatdan: ${user.createdAt.toLocaleDateString("uz-UZ")}`,
    { reply_markup: keyboard }
  );
}

// ================================
// SOTUVCHILAR RO'YXATI
// ================================

async function handleAdminSellers(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const sellers = await getAllSellers();

  if (sellers.length === 0) {
    await ctx.reply("Sotuvchilar yo'q.");
    return;
  }

  const statusEmoji = { pending: "⏳", active: "✅", blocked: "🚫", rejected: "❌" };
  const keyboard = new InlineKeyboard();

  sellers.forEach((s) => {
    keyboard
      .text(
        `${statusEmoji[s.status]} ${s.shopName} (${s.phone})`,
        `admin:seller:detail:${s._id}`
      )
      .row();
  });

  await ctx.reply(
    `🏪 SOTUVCHILAR (${sellers.length} ta)\n\nBirini tanlang:`,
    { reply_markup: keyboard }
  );
}

// ================================
// SOTUVCHI DETAIL
// ================================

async function handleAdminSellerDetail(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const sellerId = ctx.match[1];
  const { Seller } = require("../../models/Seller");
  const seller = await Seller.findById(sellerId);

  if (!seller) {
    await ctx.answerCallbackQuery("Topilmadi");
    return;
  }

  await ctx.answerCallbackQuery();

  const products = await Product.countDocuments({ sellerId: seller._id });
  const keyboard = new InlineKeyboard();

  if (seller.status === "pending") {
    keyboard
      .text("✅ Tasdiqlash", `admin:seller:approve:${sellerId}`)
      .text("❌ Rad etish", `admin:seller:reject:${sellerId}`);
  } else if (seller.status === "active") {
    keyboard.text("🚫 Bloklash", `admin:seller:block:${sellerId}`);
  } else if (seller.status === "blocked") {
    keyboard.text("✅ Faollashtirish", `admin:seller:unblock:${sellerId}`);
  }
  keyboard.row().text("🔙 Orqaga", "admin:sellers:back");

  await ctx.reply(
    `🏪 SOTUVCHI\n\n` +
    `Do'kon: ${seller.shopName}\n` +
    `Telefon: ${seller.phone}\n` +
    `Tavsif: ${seller.description || "—"}\n` +
    `Telegram ID: ${seller.telegramId}\n` +
    `Mahsulotlar: ${products} ta\n` +
    `Holat: ${seller.status}\n` +
    `Ariza: ${seller.createdAt.toLocaleDateString("uz-UZ")}`,
    { reply_markup: keyboard }
  );
}

// ================================
// KUTILAYOTGAN ARIZALAR
// ================================

async function handleAdminPending(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const { Seller } = require("../../models/Seller");
  const pendingSellers = await Seller.find({ status: "pending" });
  const pendingProducts = await Product.find({ status: "pending" });

  const keyboard = new InlineKeyboard();

  if (pendingSellers.length > 0) {
    keyboard.text(`🏪 Sotuvchi arizalari (${pendingSellers.length})`, "admin:pending:sellers").row();
  }
  if (pendingProducts.length > 0) {
    keyboard.text(`📦 Mahsulot tekshiruvi (${pendingProducts.length})`, "admin:pending:products").row();
  }

  if (pendingSellers.length === 0 && pendingProducts.length === 0) {
    await ctx.reply("✅ Hamma narsa tekshirilgan! Kutilayotgan ariza yo'q.");
    return;
  }

  await ctx.reply(
    `⏳ KUTILAYOTGAN\n\n` +
    `🏪 Sotuvchi arizalari: ${pendingSellers.length} ta\n` +
    `📦 Mahsulot tekshiruvi: ${pendingProducts.length} ta`,
    { reply_markup: keyboard }
  );
}

// ================================
// MAHSULOTLAR RO'YXATI (admin)
// ================================

async function handleAdminProducts(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const products = await Product.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(20);

  if (products.length === 0) {
    await ctx.reply("✅ Tekshiruv kutayotgan mahsulot yo'q.");
    return;
  }

  const keyboard = new InlineKeyboard();
  products.forEach((p) => {
    keyboard
      .text(`📦 ${p.name} — ${formatPrice(p.price)}`, `admin:product:detail:${p._id}`)
      .row();
  });

  await ctx.reply(
    `📦 TEKSHIRUV KUTAYOTGAN MAHSULOTLAR (${products.length} ta):`,
    { reply_markup: keyboard }
  );
}

// ================================
// MAHSULOT DETAIL (admin)
// ================================

async function handleAdminProductDetail(ctx) {
  if (!isAdmin(ctx.from.id)) return;

  const productId = ctx.match[1];
  const product = await Product.findById(productId);

  if (!product) {
    await ctx.answerCallbackQuery("Topilmadi");
    return;
  }

  await ctx.answerCallbackQuery();

  const keyboard = new InlineKeyboard()
    .text("✅ Tasdiqlash", `admin:product:approve:${productId}`)
    .text("❌ Rad etish", `admin:product:reject:${productId}`)
    .row()
    .text("🚫 Bloklash", `admin:product:block:${productId}`)
    .row()
    .text("🔙 Orqaga", "admin:products:back");

  const text =
    `📦 MAHSULOT TEKSHIRUVI\n\n` +
    `Nomi: ${product.name}\n` +
    `Narx: ${formatPrice(product.price)}\n` +
    `Min narx: ${formatPrice(product.minPrice)}\n` +
    `Ombor: ${product.stock} dona\n` +
    `Kategoriya: ${product.category}\n` +
    `Sotuvchi ID: ${product.sellerTelegramId}\n` +
    `Holat: ${product.status}\n\n` +
    `Tavsif: ${product.description || "—"}`;

  if (product.images && product.images.length > 0) {
    await ctx.replyWithPhoto(product.images[0], { caption: text, reply_markup: keyboard });
  } else {
    await ctx.reply(text, { reply_markup: keyboard });
  }
}

// ================================
// CALLBACK QUERY HANDLERLARI
// ================================

async function handleAdminCallbacks(ctx, bot) {
  if (!isAdmin(ctx.from.id)) {
    await ctx.answerCallbackQuery("❌ Ruxsat yo'q");
    return;
  }

  const data = ctx.callbackQuery.data;
  const { Seller } = require("../../models/Seller");

  // --- SOTUVCHI TASDIQLASH ---
  if (data.startsWith("admin:seller:approve:")) {
    const sellerId = data.split(":")[3];
    const seller = await updateSellerStatus(sellerId, "active");
    await ctx.answerCallbackQuery("✅ Sotuvchi tasdiqlandi!");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    // Sotuvchiga xabar
    await bot.api.sendMessage(
      seller.telegramId,
      `🎉 TABRIKLAYMIZ!\n\n` +
      `Sizning "${seller.shopName}" do'koningiz tasdiqlandi!\n\n` +
      `Endi mahsulotlaringizni qo'shishingiz mumkin.\n` +
      `"🏪 Sotuvchi bo'lish" tugmasini bosing.`
    );
    return;
  }

  // --- SOTUVCHI RAD ETISH ---
  if (data.startsWith("admin:seller:reject:")) {
    const sellerId = data.split(":")[3];
    const seller = await updateSellerStatus(sellerId, "rejected", "Ariza talablariga javob bermadi");
    await ctx.answerCallbackQuery("❌ Rad etildi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await bot.api.sendMessage(
      seller.telegramId,
      `❌ Afsuski, arizangiz rad etildi.\n\nSabab: Ariza talablariga javob bermadi\n\nQo'shimcha ma'lumot uchun admin bilan bog'laning.`
    );
    return;
  }

  // --- SOTUVCHI BLOKLASH ---
  if (data.startsWith("admin:seller:block:")) {
    const sellerId = data.split(":")[3];
    const seller = await blockSeller(sellerId);
    await ctx.answerCallbackQuery("🚫 Bloklandi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await bot.api.sendMessage(
      seller.telegramId,
      `🚫 Sizning sotuvchi hisobingiz bloklandi. Admin bilan bog'laning.`
    );
    return;
  }

  // --- SOTUVCHI BLOKDAN CHIQARISH ---
  if (data.startsWith("admin:seller:unblock:")) {
    const sellerId = data.split(":")[3];
    const seller = await unblockSeller(sellerId);
    await ctx.answerCallbackQuery("✅ Faollashtirildi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await bot.api.sendMessage(
      seller.telegramId,
      `✅ Sotuvchi hisobingiz qayta faollashtirildi!`
    );
    return;
  }

  // --- MAHSULOT TASDIQLASH ---
  if (data.startsWith("admin:product:approve:")) {
    const productId = data.split(":")[3];
    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "active" },
      { returnDocument: "after" }
    );
    await ctx.answerCallbackQuery("✅ Mahsulot tasdiqlandi!");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await bot.api.sendMessage(
      product.sellerTelegramId,
      `✅ "${product.name}" mahsulotingiz tasdiqlandi va katalogda ko'rinmoqda!`
    );
    return;
  }

  // --- MAHSULOT RAD ETISH ---
  if (data.startsWith("admin:product:reject:")) {
    const productId = data.split(":")[3];
    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "rejected", rejectReason: "Mahsulot talablariga javob bermadi" },
      { returnDocument: "after" }
    );
    await ctx.answerCallbackQuery("❌ Rad etildi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await bot.api.sendMessage(
      product.sellerTelegramId,
      `❌ "${product.name}" mahsulotingiz rad etildi.\nSabab: Mahsulot talablariga javob bermadi`
    );
    return;
  }

  // --- MAHSULOT BLOKLASH ---
  if (data.startsWith("admin:product:block:")) {
    const productId = data.split(":")[3];
    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "blocked" },
      { returnDocument: "after" }
    );
    await ctx.answerCallbackQuery("🚫 Bloklandi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });

    await bot.api.sendMessage(
      product.sellerTelegramId,
      `🚫 "${product.name}" mahsulotingiz bloklandi.`
    );
    return;
  }

  // --- USER BLOKLASH ---
  if (data.startsWith("admin:user:block:")) {
    const telegramId = Number(data.split(":")[3]);
    await User.findOneAndUpdate({ telegramId }, { isBlocked: true });
    await ctx.answerCallbackQuery("🚫 Foydalanuvchi bloklandi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    return;
  }

  // --- USER BLOKDAN CHIQARISH ---
  if (data.startsWith("admin:user:unblock:")) {
    const telegramId = Number(data.split(":")[3]);
    await User.findOneAndUpdate({ telegramId }, { isBlocked: false });
    await ctx.answerCallbackQuery("✅ Blokdan chiqarildi");
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
    return;
  }

  // --- NAVIGATSIYA ---
  if (data === "admin:sellers:back") {
    await ctx.answerCallbackQuery();
    await handleAdminSellers(ctx);
    return;
  }

  if (data === "admin:products:back") {
    await ctx.answerCallbackQuery();
    await handleAdminProducts(ctx);
    return;
  }

  if (data === "admin:users:back") {
    await ctx.answerCallbackQuery();
    await handleAdminUsers(ctx);
    return;
  }

  if (data === "admin:pending:sellers") {
    await ctx.answerCallbackQuery();
    await handleAdminSellers(ctx);
    return;
  }

  if (data === "admin:pending:products") {
    await ctx.answerCallbackQuery();
    await handleAdminProducts(ctx);
    return;
  }
}

module.exports = {
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
};

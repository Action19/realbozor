const { Keyboard, InlineKeyboard } = require("grammy");
const { startNegotiation, processMessage, cancelNegotiation } = require("../../services/negotiation");
const { getProductById, formatPrice } = require("../../services/product");
const { getUserByTelegramId } = require("../../services/user");

const mainKeyboard = new Keyboard()
  .text("🛍 Katalog").text("🛒 Savatcha")
  .row()
  .text("📦 Buyurtmalarim").text("👤 Profilim")
  .row()
  .text("🏪 Sotuvchi bo'lish")
  .resized();

// ================================
// SAVDOLASHISHNI BOSHLASH
// Bot yoki Mini App dan chaqiriladi
// ================================

async function handleStartNegotiation(ctx, productId, userState) {
  const telegramId = ctx.from.id;

  // Foydalanuvchi tekshiruvi
  const user = await getUserByTelegramId(telegramId);
  if (user?.isBlocked) {
    await ctx.reply("❌ Sizning hisobingiz bloklangan.");
    return;
  }

  // Mahsulot tekshiruvi
  const product = await getProductById(productId);
  if (!product) {
    await ctx.reply("❌ Mahsulot topilmadi.");
    return;
  }

  if (product.status !== "active") {
    await ctx.reply("❌ Bu mahsulot hozirda mavjud emas.");
    return;
  }

  if (product.stock < 1) {
    await ctx.reply("❌ Bu mahsulot tugagan.");
    return;
  }

  // O'z mahsulotiga savdolashib bo'lmaydi
  if (product.sellerTelegramId === telegramId) {
    await ctx.reply("❌ O'z mahsulotingizga savdolasha olmaysiz.");
    return;
  }

  // Savdolashishni boshlash
  const negotiation = await startNegotiation(telegramId, product);

  // Holat: savdo kutayapti
  userState.set(telegramId, {
    step: "negotiating",
    negotiationId: String(negotiation._id),
    productId: String(product._id),
  });

  const stopKeyboard = new Keyboard()
    .text("🚫 Savdolashishni to'xtatish")
    .resized();

  await ctx.reply(
    `🤝 SAVDOLASHISH BOSHLANDI\n\n` +
    `📦 Mahsulot: ${product.name}\n` +
    `💰 Boshlang'ich narx: ${formatPrice(product.price)}\n` +
    `🚚 Kargo: ${formatPrice(product.cargoPrice)}\n` +
    `⏱ Yetkazish: ${product.deliveryDays}\n\n` +
    `Sotuvchi bilan narx bo'yicha gaplashing.\n` +
    `Narx taklif qiling yoki savol bering 👇`,
    { reply_markup: stopKeyboard }
  );

  // AI sotuvchining birinchi xabari
  const firstMessage = `Savdolashamizmi? 😊\n\nHo'sh, ${product.name} uchun qancha berasiz? Boshlang'ich narximiz ${formatPrice(product.price)} — lekin gaplashib ko'ramiz!`;

  await ctx.reply(`🛍 Sotuvchi: ${firstMessage}`);
}

// ================================
// XARIDORNING XABARINI QAYTA ISHLASH
// ================================

async function handleNegotiationMessage(ctx, userState) {
  const telegramId = ctx.from.id;
  const text = ctx.message.text.trim();
  const state = userState.get(telegramId);

  if (state?.step !== "negotiating") return false;

  // To'xtatish
  if (text === "🚫 Savdolashishni to'xtatish") {
    await cancelNegotiation(state.negotiationId);
    userState.delete(telegramId);
    await ctx.reply(
      "❌ Savdolashish to'xtatildi.\n\nQachon xohlasangiz qaytishingiz mumkin!",
      { reply_markup: mainKeyboard }
    );
    return true;
  }

  // Mahsulotni olish
  const product = await getProductById(state.productId);
  if (!product) {
    userState.delete(telegramId);
    await ctx.reply("❌ Xatolik. Qaytadan urinib ko'ring.", { reply_markup: mainKeyboard });
    return true;
  }

  // "Yozayapti..." ko'rsatish
  await ctx.replyWithChatAction("typing");

  try {
    const result = await processMessage(state.negotiationId, text, product);

    if (result.error) {
      await ctx.reply(`❌ ${result.error}`, { reply_markup: mainKeyboard });
      userState.delete(telegramId);
      return true;
    }
    // Kelishildi!
    if (result.agreed && result.finalPrice) {
      userState.delete(telegramId);

      const totalPrice = result.finalPrice + product.cargoPrice;

      const orderKeyboard = new InlineKeyboard()
        .text("✅ Buyurtma berish", `order:confirm:${state.negotiationId}`)
        .row()
        .text("❌ Bekor qilish", `order:cancel:${state.negotiationId}`);

      await ctx.reply(
        `🛍 Sotuvchi: ${result.response}`,
        { reply_markup: new Keyboard().text("🛍 Katalog").resized() }
      );

      await ctx.reply(
        `🎉 SAVDO YAKUNLANDI!\n\n` +
        `📦 Mahsulot: ${product.name}\n` +
        `💰 Kelishilgan narx: ${formatPrice(result.finalPrice)}\n` +
        `🚚 Kargo: ${formatPrice(product.cargoPrice)}\n` +
        `💵 JAMI: ${formatPrice(totalPrice)}\n\n` +
        `⏱ Yetkazish: ${product.deliveryDays}\n\n` +
        `Buyurtma berishni tasdiqlaysizmi?`,
        { reply_markup: orderKeyboard }
      );
      return true;
    }

    // Savdo davom etmoqda
    await ctx.reply(`🛍 Sotuvchi: ${result.response}`);

  } catch (error) {
    console.error("AI xatosi tafsilot:", error.message, error.status, error.code);
    await ctx.reply(
      "⚠️ Sotuvchi hozir band. Biroz kutib qayta urinib ko'ring.",
    );
  }

  return true;
}

// ================================
// BUYURTMA TASDIQLASH — manzil so'rash
// ================================

async function handleOrderConfirm(ctx, userState) {
  const negotiationId = ctx.match[1];
  await ctx.answerCallbackQuery();

  const user = await getUserByTelegramId(ctx.from.id);

  // Manzil mavjud bo'lsa — to'g'ridan to'g'ri to'lov
  if (user?.address && user?.phone) {
    userState.set(ctx.from.id, {
      step: "order:confirm_address",
      negotiationId,
    });

    const keyboard = new InlineKeyboard()
      .text("✅ Ha, shu manzilga", `order:place:${negotiationId}`)
      .row()
      .text("📍 Boshqa manzil", `order:new_address:${negotiationId}`);

    await ctx.reply(
      `📍 YETKAZIB BERISH MANZILI\n\n` +
      `Telefon: ${user.phone}\n` +
      `Manzil: ${user.address}\n\n` +
      `Shu manzilga yetkazilsinmi?`,
      { reply_markup: keyboard }
    );
  } else {
    // Manzil yo'q — kiritish kerak
    userState.set(ctx.from.id, {
      step: "order:address",
      negotiationId,
    });

    await ctx.reply(
      `📍 Yetkazib berish manzilingizni kiriting:\n\n` +
      `Masalan:\nToshkent shahri, Chilonzor tumani,\nBunyodkor ko'chasi, 12-uy`,
      {
        reply_markup: new Keyboard()
          .text("🔙 Orqaga")
          .resized(),
      }
    );
  }
}

// ================================
// BUYURTMA BEKOR QILISH
// ================================

async function handleOrderCancel(ctx, userState) {
  const negotiationId = ctx.match[1];
  await cancelNegotiation(negotiationId);
  await ctx.answerCallbackQuery("❌ Bekor qilindi");
  userState.delete(ctx.from.id);
  await ctx.reply("❌ Buyurtma bekor qilindi.", { reply_markup: mainKeyboard });
}

module.exports = {
  handleStartNegotiation,
  handleNegotiationMessage,
  handleOrderConfirm,
  handleOrderCancel,
};

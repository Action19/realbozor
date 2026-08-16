const { Negotiation } = require("../models/Negotiation");
const { User } = require("../models/User");
const { getAIResponse, extractAgreedPrice, validatePrice } = require("./ai");

// ================================
// SAVDOLASHISHNI BOSHLASH
// ================================

async function startNegotiation(telegramId, product) {
  // Mavjud aktiv savdolashishni tekshirish
  const existing = await Negotiation.findOne({
    buyerTelegramId: telegramId,
    productId: product._id,
    status: "active",
  });

  if (existing) return existing;

  // Foydalanuvchini topish
  const user = await User.findOne({ telegramId });

  // Yangi savdolashish yaratish
  const negotiation = await Negotiation.create({
    userId: user._id,
    buyerTelegramId: telegramId,
    productId: product._id,
    sellerId: product.sellerId,
    initialPrice: product.price,
    minPrice: product.minPrice,
    messages: [],
    status: "active",
  });

  return negotiation;
}

// ================================
// XARIDOR XABARINI QAYTA ISHLASH
// ================================

async function processMessage(negotiationId, userMessage, product) {
  const negotiation = await Negotiation.findById(negotiationId);

  if (!negotiation || negotiation.status !== "active") {
    return { error: "Savdolashish topilmadi yoki tugagan." };
  }

  // Xaridor xabarini saqlash
  negotiation.messages.push({ role: "user", content: userMessage });

  // AI dan javob olish
  const aiResponse = await getAIResponse(product, negotiation.messages);

  // AI javobini saqlash
  negotiation.messages.push({ role: "assistant", content: aiResponse });

  // Kelishildi belgilanganmi tekshirish
  const agreedPrice = extractAgreedPrice(aiResponse);
  let agreed = false;
  let validatedPrice = null;

  if (agreedPrice !== null) {
    // Backend narxni tekshiradi — AI ga ishonib bo'lmaydi
    const check = validatePrice(agreedPrice, product.minPrice);

    if (check.valid) {
      negotiation.status = "agreed";
      negotiation.finalPrice = agreedPrice;
      agreed = true;
      validatedPrice = agreedPrice;
    } else {
      // AI noto'g'ri kelishdi — logga yoz, lekin davom et
      console.warn(
        `AI minPrice dan past kelishdi: ${agreedPrice} < ${product.minPrice}. Rad etildi.`
      );
      // Javobdan KELISHDIK ni olib tashlaymiz
      negotiation.messages[negotiation.messages.length - 1].content =
        aiResponse.replace(/KELISHDIK:\d+/, "").trim();
    }
  }

  await negotiation.save();

  // AI javobini tozalash — foydalanuvchiga KELISHDIK:XXXXX ko'rinmasin
  const cleanResponse = aiResponse.replace(/KELISHDIK:\d+/g, "").trim();

  return {
    response: cleanResponse,
    agreed,
    finalPrice: validatedPrice,
    negotiationId: negotiation._id,
  };
}

// ================================
// SAVDOLASHISHNI OLISH
// ================================

async function getNegotiationById(id) {
  return Negotiation.findById(id);
}

async function getActiveNegotiation(telegramId, productId) {
  return Negotiation.findOne({
    buyerTelegramId: telegramId,
    productId,
    status: "active",
  });
}

// ================================
// SAVDOLASHISHNI BEKOR QILISH
// ================================

async function cancelNegotiation(negotiationId) {
  await Negotiation.findByIdAndUpdate(negotiationId, { status: "rejected" });
}

module.exports = {
  startNegotiation,
  processMessage,
  getNegotiationById,
  getActiveNegotiation,
  cancelNegotiation,
};

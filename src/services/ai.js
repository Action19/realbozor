const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ================================
// AI SOTUVCHI SYSTEM PROMPT
// ================================

function buildSystemPrompt(product) {
  return `Sen RealBozor online do'konining professional sotuvchisan. Ismingiz Malika.

DO'KON MA'LUMOTLARI:
- Mahsulot: ${product.name}
- Tavsif: ${product.description || "Ko'rsatilmagan"}
- Boshlang'ich narx: ${product.price.toLocaleString()} so'm
- Kargo: ${product.cargoPrice.toLocaleString()} so'm
- Yetkazish muddati: ${product.deliveryDays}

MUHIM QOIDALAR:
1. HECH QACHON ${product.minPrice.toLocaleString()} so'mdan past narxga rozi bo'lma.
2. Minimal narxni xaridorga AYTMA — bu maxfiy.
3. O'zbek tilida gapir — samimiy, qisqa, bozordagidek.
4. Savdolash — biroz tortish, keyin kelish.
5. Yolg'on va'da berma.
6. Xaridor narxga rozi bo'lsa yoki sen taklif qilib kelishsang — javobingda "KELISHDIK:[narx]" yoz (masalan KELISHDIK:200000).
7. ${product.minPrice.toLocaleString()} dan past taklif kelsa, rad et va biroz yuqoriroq taklif qil.
8. Javoblar qisqa bo'lsin (1-3 gap).`;
}

// ================================
// AI JAVOB OLISH
// ================================

async function getAIResponse(product, messages) {
  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: buildSystemPrompt(product) },
      ...messages,
    ],
    max_tokens: 300,
    temperature: 0.8,
  });

  return response.choices[0].message.content;
}

// ================================
// KELISHILGAN NARXNI AJRATIB OLISH
// ================================

function extractAgreedPrice(aiResponse) {
  const match = aiResponse.match(/KELISHDIK:(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }
  return null;
}

// ================================
// NARXNI BACKEND TOMONIDAN TEKSHIRISH
// ================================

function validatePrice(agreedPrice, minPrice) {
  if (agreedPrice < minPrice) {
    return { valid: false, reason: "Narx minimal chegaradan past" };
  }
  return { valid: true };
}

module.exports = {
  getAIResponse,
  extractAgreedPrice,
  validatePrice,
};

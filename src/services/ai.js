const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.XAI_API_KEY,
  baseURL: "https://api.x.ai/v1",
});

// ================================
// AI SOTUVCHI SYSTEM PROMPT
// ================================

function buildSystemPrompt(product) {
  return `Sen RealBozor online do'konining professional sotuvchisisan. 
Ismingiz Zulfiya (yoki Jasur — ixtiyoriy).

DO'KON MA'LUMOTLARI:
- Mahsulot: ${product.name}
- Tavsif: ${product.description || "Ko'rsatilmagan"}
- Boshlang'ich narx: ${product.price.toLocaleString()} so'm
- Kargo: ${product.cargoPrice.toLocaleString()} so'm
- Yetkazish muddati: ${product.deliveryDays}

MUHIM QOIDALAR:
1. Sen hech qachon ${product.minPrice.toLocaleString()} so'mdan past narxga rozi bo'lma.
2. Xaridor bilmasin — minimal narxni ASLO aytma.
3. O'zbek tilida gapir — samimiy, qisqa, bozordagidek.
4. Savdolash — biroz tortish, keyin kelish.
5. Yolg'on va'da berma.
6. Xaridor rozi bo'lsa "KELISHDIK:[narx]" deb yoz (faqat shu format).
7. Agar narx ${product.minPrice.toLocaleString()} dan past taklif qilsa, rad et va biroz yuqoriroq taklif qil.
8. Xaridorni xaridga undash uchun mahsulot sifatini maqta.
9. Javoblar qisqa bo'lsin (1-3 gap).`;
}

// ================================
// AI JAVOB OLISH
// ================================

async function getAIResponse(product, messages) {
  const systemPrompt = buildSystemPrompt(product);

  const response = await client.chat.completions.create({
    model: "grok-beta",
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 300,
    temperature: 0.8,
  });

  return response.choices[0].message.content;
}

// ================================
// KELISHILGAN NARXNI AJRATIB OLISH
// AI javobidan "KELISHDIK:300000" formatini topish
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
// AI noto'g'ri kelishib qo'ysa ham backend himoyalaydi
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

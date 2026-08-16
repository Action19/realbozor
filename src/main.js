require("dotenv").config();

const { connectDatabase } = require("./config/database");

// ================================
// BOT VA SERVER BIRGALIKDA ISHGA TUSHIRISH
// ================================

async function main() {
  // 1. Database ga ulanish
  await connectDatabase();

  // 2. Express API serverni ishga tushirish
  require("./server");

  // 3. Telegram botni ishga tushirish
  require("./bot/bot");
}

main().catch((error) => {
  console.error("🔴 Ishga tushirishda xato:", error);
  process.exit(1);
});

const mongoose = require("mongoose");

async function connectDatabase() {
  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MONGODB_URI .env faylida topilmadi");
    }

    await mongoose.connect(uri);

    console.log("🟢 MongoDB bazaga ulandi!");
  } catch (error) {
    console.error("🔴 MongoDB ulanish xatosi:", error);
    process.exit(1);
  }
}

module.exports = { connectDatabase };

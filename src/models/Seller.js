const mongoose = require("mongoose");

const sellerSchema = new mongoose.Schema(
  {
    // Bog'liq foydalanuvchi
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },

    // Do'kon ma'lumotlari
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      required: true,
    },

    // Tasdiqlash holati
    // pending  — ariza berildi, admin tekshirayapti
    // active   — tasdiqlangan, faol sotuvchi
    // blocked  — bloklangan
    // rejected — rad etilgan
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "rejected"],
      default: "pending",
    },

    // Rad etish sababi
    rejectReason: {
      type: String,
      default: "",
    },

    // Statistika
    totalProducts: {
      type: Number,
      default: 0,
    },

    totalSales: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Seller = mongoose.model("Seller", sellerSchema);

module.exports = { Seller };

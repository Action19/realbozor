const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // Sotuvchi
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },

    sellerTelegramId: {
      type: Number,
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    category: {
      type: String,
      required: true,
    },

    price: {
      type: Number,
      required: true,
    },

    // Minimal sotish narxi — foydalanuvchiga ko'rsatilmaydi
    minPrice: {
      type: Number,
      required: true,
    },

    stock: {
      type: Number,
      default: 0,
    },

    images: {
      type: [String],
      default: [],
    },

    cargoPrice: {
      type: Number,
      default: 25000,
    },

    deliveryDays: {
      type: String,
      default: "2-3 ish kuni",
    },

    // Mahsulot holati
    // pending  — admin tekshirayapti
    // active   — tasdiqlangan, ko'rinadi
    // blocked  — admin bloklagan
    // rejected — rad etilgan
    status: {
      type: String,
      enum: ["pending", "active", "blocked", "rejected"],
      default: "pending",
    },

    rejectReason: {
      type: String,
      default: "",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Product = mongoose.model("Product", productSchema);

module.exports = { Product };

const mongoose = require("mongoose");

const negotiationSchema = new mongoose.Schema(
  {
    // Kimlar
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    buyerTelegramId: {
      type: Number,
      required: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      required: true,
    },

    // Narxlar
    initialPrice: {
      type: Number,
      required: true,
    },

    minPrice: {
      type: Number,
      required: true,
    },

    finalPrice: {
      type: Number,
      default: null,
    },

    // Suhbat tarixi — AI ga yuboriladi
    // [ { role: "user"/"assistant", content: "..." } ]
    messages: {
      type: Array,
      default: [],
    },

    // Holat
    // active    — savdo davom etmoqda
    // agreed    — kelishildi
    // rejected  — rad etildi
    // expired   — muddati o'tdi
    status: {
      type: String,
      enum: ["active", "agreed", "rejected", "expired"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Negotiation = mongoose.model("Negotiation", negotiationSchema);

module.exports = { Negotiation };

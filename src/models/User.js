const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // Telegram ma'lumotlari
    telegramId: {
      type: Number,
      required: true,
      unique: true,
    },

    firstName: {
      type: String,
      default: "",
    },

    lastName: {
      type: String,
      default: "",
    },

    username: {
      type: String,
      default: "",
    },

    // Qo'shimcha ma'lumotlar
    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    // Rol: buyer (xaridor), seller (sotuvchi), admin
    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer",
    },

    // Agar sotuvchi bo'lsa — Seller ID
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Seller",
      default: null,
    },

    // Bloklash
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };

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

    // Qo'shimcha ma'lumotlar (keyinchalik to'ldiriladi)
    phone: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    // Foydalanuvchi holati
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt va updatedAt avtomatik qo'shiladi
  }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };

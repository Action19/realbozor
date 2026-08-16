require("dotenv").config();

const express = require("express");
const path = require("path");
const { Product } = require("./models/Product");

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// MIDDLEWARE
// ================================

app.use(express.json());

// CORS — Mini App (Netlify) dan so'rovlarga ruxsat
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  next();
});

// ================================
// KATEGORIYALAR
// ================================

const CATEGORIES = [
  { id: "bags", label: "Ayollar sumkalari", icon: "👜" },
  { id: "accessories", label: "Aksessuarlar", icon: "💍" },
  { id: "clothes", label: "Kiyimlar", icon: "👗" },
  { id: "gifts", label: "Sovg'alar", icon: "🎁" },
  { id: "other", label: "Boshqa", icon: "🛍" },
];

// ================================
// API ENDPOINTLAR
// ================================

// Sog'liq tekshiruvi
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "RealBozor API ishlayapti" });
});

// Barcha kategoriyalar
app.get("/api/categories", (req, res) => {
  res.json({ success: true, data: CATEGORIES });
});

// Barcha faol mahsulotlar (ixtiyoriy: ?category=bags)
app.get("/api/products", async (req, res) => {
  try {
    const filter = { isActive: true, stock: { $gt: 0 } };

    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter)
      .select("-minPrice") // minPrice ni mijozga YUBORMAYDI
      .sort({ createdAt: -1 });

    res.json({ success: true, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// Bitta mahsulot
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .select("-minPrice"); // minPrice ni mijozga YUBORMAYDI

    if (!product) {
      return res.status(404).json({ success: false, message: "Mahsulot topilmadi" });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server xatosi" });
  }
});

// ================================
// SERVERNI ISHGA TUSHIRISH
// main.js dan chaqirilganda database allaqachon ulangan bo'ladi
// ================================

app.listen(PORT, () => {
  console.log(`🌐 API server ishga tushdi: http://localhost:${PORT}`);
  console.log(`📡 Mahsulotlar: http://localhost:${PORT}/api/products`);
});

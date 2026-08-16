// ================================
// KONFIGURATSIYA
// API_URL Render ga deploy qilingandan keyin o'zgartiriladi
// ================================

const API_URL = window.REALBOZOR_API_URL || "https://realbozor.onrender.com";

// ================================
// TELEGRAM MINI APP INIT
// ================================

const tg = window.Telegram?.WebApp;

if (tg) {
  tg.ready();
  tg.expand(); // To'liq ekranga ochish
}

// ================================
// HOLAT
// ================================

let allProducts = [];
let filteredProducts = [];
let activeCategory = "all";
let cartItems = [];
let currentProduct = null;

// ================================
// DOM ELEMENTLAR
// ================================

const loading = document.getElementById("loading");
const empty = document.getElementById("empty");
const productsGrid = document.getElementById("productsGrid");
const categoriesScroll = document.getElementById("categoriesScroll");
const searchInput = document.getElementById("searchInput");
const modalOverlay = document.getElementById("modalOverlay");
const modalClose = document.getElementById("modalClose");
const cartCount = document.getElementById("cartCount");

// ================================
// KATEGORIYALAR
// ================================

async function loadCategories() {
  try {
    const res = await fetch(`${API_URL}/api/categories`);
    const json = await res.json();

    if (!json.success) return;

    json.data.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "category-chip";
      btn.dataset.id = cat.id;
      btn.textContent = `${cat.icon} ${cat.label}`;
      btn.addEventListener("click", () => selectCategory(cat.id));
      categoriesScroll.appendChild(btn);
    });
  } catch (err) {
    console.error("Kategoriyalar yuklanmadi:", err);
  }
}

function selectCategory(categoryId) {
  activeCategory = categoryId;

  // Aktiv chip ni yangilash
  document.querySelectorAll(".category-chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.id === categoryId);
  });

  filterAndRender();
}

// ================================
// MAHSULOTLAR
// ================================

async function loadProducts() {
  showLoading(true);

  try {
    const res = await fetch(`${API_URL}/api/products`);
    const json = await res.json();

    if (!json.success) throw new Error("API xatosi");

    allProducts = json.data;
    filterAndRender();
  } catch (err) {
    console.error("Mahsulotlar yuklanmadi:", err);
    showLoading(false);
    showEmpty(true);
  }
}

function filterAndRender() {
  const query = searchInput.value.trim().toLowerCase();

  filteredProducts = allProducts.filter((p) => {
    const matchCategory =
      activeCategory === "all" || p.category === activeCategory;
    const matchSearch =
      !query ||
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query);
    return matchCategory && matchSearch;
  });

  renderProducts(filteredProducts);
}

function renderProducts(products) {
  showLoading(false);

  if (products.length === 0) {
    showEmpty(true);
    productsGrid.innerHTML = "";
    return;
  }

  showEmpty(false);

  productsGrid.innerHTML = products.map((p) => createCardHTML(p)).join("");

  // Kartochkalarga click hodisasi
  document.querySelectorAll(".product-card").forEach((card) => {
    card.addEventListener("click", () => {
      const productId = card.dataset.id;
      openProductModal(productId);
    });
  });

  // Sevimli tugmasi
  document.querySelectorAll(".card-fav").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      btn.textContent = btn.textContent === "🤍" ? "❤️" : "🤍";
    });
  });
}

function createCardHTML(product) {
  const hasImage = product.images && product.images.length > 0;
  const imageHTML = hasImage
    ? `<img class="card-image" src="${product.images[0]}" alt="${product.name}" loading="lazy" />`
    : `<div class="card-image-placeholder">🛍</div>`;

  const price = formatPrice(product.price);

  return `
    <div class="product-card" data-id="${product._id}">
      <div class="card-image-wrap">
        ${imageHTML}
        <div class="card-badge">Yangi</div>
        <button class="card-fav">🤍</button>
      </div>
      <div class="card-body">
        <div class="card-name">${product.name}</div>
        <div class="card-price">${price}</div>
        <div class="card-price-sub">🤝 Narx kelishiladi</div>
      </div>
      <div class="card-footer">
        <button class="card-btn">Ko'rish →</button>
      </div>
    </div>
  `;
}

// ================================
// MODAL
// ================================

async function openProductModal(productId) {
  try {
    const res = await fetch(`${API_URL}/api/products/${productId}`);
    const json = await res.json();

    if (!json.success) return;

    currentProduct = json.data;
    fillModal(currentProduct);
    modalOverlay.classList.add("open");

    // Telegram haptic feedback
    tg?.HapticFeedback?.impactOccurred("light");
  } catch (err) {
    console.error("Mahsulot yuklanmadi:", err);
  }
}

function fillModal(product) {
  const categoryLabels = {
    bags: "👜 Sumkalar",
    accessories: "💍 Aksessuarlar",
    clothes: "👗 Kiyimlar",
    gifts: "🎁 Sovg'alar",
    other: "🛍 Boshqa",
  };

  // Rasm
  const modalImage = document.getElementById("modalImage");
  const modalImagePlaceholder = document.getElementById("modalImagePlaceholder");

  if (product.images && product.images.length > 0) {
    modalImage.src = product.images[0];
    modalImage.classList.add("loaded");
    modalImagePlaceholder.style.display = "none";
  } else {
    modalImage.classList.remove("loaded");
    modalImagePlaceholder.style.display = "flex";
  }

  // Ma'lumotlar
  document.getElementById("modalCategory").textContent =
    categoryLabels[product.category] || product.category;
  document.getElementById("modalTitle").textContent = product.name;
  document.getElementById("modalPrice").textContent = formatPrice(product.price);
  document.getElementById("modalDesc").textContent =
    product.description || "Tavsif mavjud emas";
  document.getElementById("modalCargo").textContent = formatPrice(product.cargoPrice);
  document.getElementById("modalDelivery").textContent = product.deliveryDays;

  // Mavjudlik
  const stockEl = document.getElementById("modalStock");
  if (product.stock > 0) {
    stockEl.textContent = `✅ ${product.stock} dona`;
    stockEl.className = "modal-stock in-stock";
  } else {
    stockEl.textContent = "❌ Sotib bo'lindi";
    stockEl.className = "modal-stock out-stock";
  }
}

function closeModal() {
  modalOverlay.classList.remove("open");
  currentProduct = null;
}

// ================================
// SAVDOLASHISH — bot ga qaytish
// ================================

document.getElementById("btnNegotiate").addEventListener("click", () => {
  if (!currentProduct) return;

  // Telegram Mini App dan bot ga ma'lumot yuborish
  if (tg) {
    tg.sendData(
      JSON.stringify({
        action: "negotiate",
        productId: currentProduct._id,
        productName: currentProduct.name,
      })
    );
  } else {
    alert(`Savdolashish: ${currentProduct.name}`);
  }

  closeModal();
});

// ================================
// SAVATCHAGA QO'SHISH
// ================================

document.getElementById("btnCart").addEventListener("click", () => {
  if (!currentProduct) return;

  const exists = cartItems.find((i) => i._id === currentProduct._id);
  if (!exists) {
    cartItems.push(currentProduct);
    updateCartCount();

    // Tugmani o'zgartirish
    const btn = document.getElementById("btnCart");
    btn.textContent = "✅ Qo'shildi";
    setTimeout(() => {
      btn.textContent = "🛒 Savatchaga";
    }, 1500);

    tg?.HapticFeedback?.notificationOccurred("success");
  }
});

function updateCartCount() {
  cartCount.textContent = cartItems.length;
}

// ================================
// MODAL YOPISH
// ================================

modalClose.addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

// ================================
// QIDIRUV
// ================================

searchInput.addEventListener("input", filterAndRender);

// ================================
// PASTKI NAVIGATSIYA
// ================================

document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const page = btn.dataset.page;

    // Hozircha faqat home ishlaydi
    if (page !== "home") {
      tg?.showAlert?.("Bu bo'lim tez orada qo'shiladi! 🔜");
    }
  });
});

// ================================
// YORDAMCHI FUNKSIYA
// ================================

function formatPrice(price) {
  return price.toLocaleString("uz-UZ") + " so'm";
}

function showLoading(show) {
  loading.style.display = show ? "flex" : "none";
}

function showEmpty(show) {
  empty.style.display = show ? "flex" : "none";
}

// ================================
// ISHGA TUSHIRISH
// ================================

async function init() {
  await loadCategories();
  await loadProducts();
}

init();

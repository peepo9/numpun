/* =========================================================
   [BRAND] — script.js
   ใช้ร่วมกันทุกหน้า: product.html, order.html, admin.html
   ตรวจจับหน้าปัจจุบันจาก element ที่มีอยู่ในหน้านั้นๆ
   ========================================================= */

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwZYCnI4r30bpVfItYJziVbHyOY8CVUVYeEFFnvx2b4pid2-Ba2ANmuOLScHIj5EIUB/exec';
const SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQVX1ZbDi1j3LMCGVPGhNWbf_TXyO0tOHsy56RZJe07-rMc0vXgfzdQANELMwxyW1ygAKSFxCm80wtV/pub?gid=0&single=true&output=csv';
const PRODUCTS_JSON_URL = 'products.json';

const MOOD_LABELS = {
  all: 'ทั้งหมด',
  refresh: 'Refresh',
  detox: 'Detox',
  glow: 'Glow',
  energy: 'Energy'
};

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('product-list')) {
    initProductPage();
  }
  if (document.getElementById('orderForm')) {
    initOrderPage();
  }
  if (document.querySelector('#ordersTable tbody')) {
    initAdminPage();
  }
});

/* =========================================================
   1. product.html — แสดงสินค้า + ตัวกรอง mood
   ========================================================= */
function initProductPage() {
  const listEl = document.getElementById('product-list');
  const filterBarEl = document.getElementById('filter-bar');

  fetch(PRODUCTS_JSON_URL)
    .then((res) => res.json())
    .then((products) => {
      const urlParams = new URLSearchParams(window.location.search);
      const initialMood = urlParams.get('mood') || 'all';

      renderFilterBar(filterBarEl, products, initialMood, (mood) => {
        renderProductList(listEl, products, mood);
      });

      renderProductList(listEl, products, initialMood);
    })
    .catch((error) => {
      console.error(error);
      listEl.innerHTML = '<p class="text-muted">ไม่สามารถโหลดข้อมูลสินค้าได้ กรุณาลองใหม่อีกครั้ง</p>';
    });
}

function renderFilterBar(filterBarEl, products, activeMood, onFilterChange) {
  if (!filterBarEl) return;

  const moods = ['all', ...Array.from(new Set(products.map((p) => p.mood)))];

  filterBarEl.innerHTML = moods
    .map((mood) => {
      const label = MOOD_LABELS[mood] || mood;
      const isActive = mood === activeMood;
      return `
        <button
          type="button"
          class="btn ${isActive ? 'btn--primary' : 'btn--secondary'} btn--sm filter-btn"
          data-mood="${mood}"
        >
          ${label}
        </button>
      `;
    })
    .join('');

  filterBarEl.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mood = btn.getAttribute('data-mood');

      filterBarEl.querySelectorAll('.filter-btn').forEach((b) => {
        b.classList.remove('btn--primary');
        b.classList.add('btn--secondary');
      });
      btn.classList.remove('btn--secondary');
      btn.classList.add('btn--primary');

      const url = new URL(window.location.href);
      if (mood === 'all') {
        url.searchParams.delete('mood');
      } else {
        url.searchParams.set('mood', mood);
      }
      window.history.replaceState({}, '', url);

      onFilterChange(mood);
    });
  });
}

function renderProductList(listEl, products, mood) {
  if (!listEl) return;

  const filtered = mood && mood !== 'all'
    ? products.filter((p) => p.mood === mood)
    : products;

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="text-muted">ไม่พบสินค้าในหมวดนี้</p>';
    return;
  }

  listEl.innerHTML = filtered.map((product) => productCardTemplate(product)).join('');
}

function productCardTemplate(product) {
  const orderUrl = `order.html?item=${encodeURIComponent(product.name + ' ' + product.size)}&price=${encodeURIComponent(product.price)}`;

  return `
    <article class="product-card">
      <img class="product-card__image" src="${product.image}" alt="${product.name}" loading="lazy">
      <div class="product-card__body">
        <span class="mood-tag" data-mood="${product.mood}">
          <span class="mood-dot" data-mood="${product.mood}"></span>
          ${MOOD_LABELS[product.mood] || product.mood}
        </span>
        <h3 class="product-card__title">${product.name}</h3>
        <p class="text-sm text-muted">${product.size}</p>
        <div class="product-card__meta">
          <div class="product-card__price">
            ${product.price}<span> บาท</span>
          </div>
          <a class="btn btn--primary btn--sm" href="${orderUrl}">สั่งซื้อ</a>
        </div>
      </div>
    </article>
  `;
}

/* =========================================================
   2. order.html — เติมฟอร์มจาก URL + ส่งคำสั่งซื้อ
   ========================================================= */
function initOrderPage() {
  const form = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  const urlParams = new URLSearchParams(window.location.search);
  const item = urlParams.get('item');
  const price = urlParams.get('price');

  if (item && itemsInput) {
    itemsInput.value = item;
  }

  if (price && totalInput) {
    totalInput.value = price;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    submitOrder(form);
  });
}

function submitOrder(form) {
  const customerName = document.getElementById('customerName').value;
  const contact = document.getElementById('contact').value;
  const items = document.getElementById('items').value;
  const total = document.getElementById('total').value;
  const note = document.getElementById('note').value;

  const payload = {
    customerName,
    contact,
    items,
    total,
    note
  };

  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
    .then(() => {
      window.location.href = 'thankyou.html';
    })
    .catch((error) => {
      console.error(error);
      alert('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    });
}

/* =========================================================
   3. admin.html — ดึง CSV มาแสดงเป็นตาราง (ล่าสุดขึ้นก่อน)
   ========================================================= */
function initAdminPage() {
  const tbody = document.querySelector('#ordersTable tbody');

  fetch(SHEET_CSV_URL)
    .then((res) => res.text())
    .then((csvText) => {
      const rows = parseCSV(csvText);
      if (rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6">ยังไม่มีข้อมูลคำสั่งซื้อ</td></tr>';
        return;
      }

      const dataRows = rows.slice(1).filter((row) => row.some((cell) => cell && cell.trim() !== ''));
      const reversedRows = dataRows.slice().reverse();

      tbody.innerHTML = reversedRows.map((row) => adminRowTemplate(row)).join('');
    })
    .catch((error) => {
      console.error(error);
      tbody.innerHTML = '<tr><td colspan="6">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</td></tr>';
    });
}

function adminRowTemplate(row) {
  const [timestamp = '', customerName = '', contact = '', items = '', total = '', note = ''] = row;

  return `
    <tr>
      <td>${escapeHtml(timestamp)}</td>
      <td>${escapeHtml(customerName)}</td>
      <td>${escapeHtml(contact)}</td>
      <td>${escapeHtml(items)}</td>
      <td>${escapeHtml(total)}</td>
      <td>${escapeHtml(note)}</td>
    </tr>
  `;
}

/**
 * Parse CSV text เป็น array ของ array (rows x columns)
 * รองรับฟิลด์ที่ครอบด้วย double quote, comma และ newline ภายในฟิลด์, และ "" สำหรับ escape quote
 */
function parseCSV(csvText) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(field);
        field = '';
      } else if (char === '\n') {
        row.push(field);
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += char;
      }
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = value ?? '';
  return div.innerHTML;
}

(function () {
  const STORAGE_KEY = 'moneyTracker.expenses';
  const CATEGORY_KEY = 'moneyTracker.categories';
  const DEFAULT_CATEGORIES = ['Makanan', 'Transportasi', 'Belanja', 'Hiburan', 'Lainnya'];
  const PALETTE = ['#ffdbdf', '#ffe797', '#dddd7b', '#e0f2f4', '#bad6da'];

  const form = document.getElementById('expenseForm');
  const amountInput = document.getElementById('amountInput');
  const notesInput = document.getElementById('notesInput');
  const errorMsg = document.getElementById('errorMsg');
  const emptyState = document.getElementById('emptyState');
  const totalAmountEl = document.getElementById('totalAmount');
  const itemCountEl = document.getElementById('itemCount');
  const todayDateEl = document.getElementById('todayDate');

  const categoryScroll = document.getElementById('categoryScroll');
  const transactionListEl = document.getElementById('transactionList');

  const categoryModalOverlay = document.getElementById('categoryModalOverlay');
  const newCategoryInput = document.getElementById('newCategoryInput');
  const confirmCategoryBtn = document.getElementById('confirmBtn');
  const cancelCategoryBtn = document.getElementById('cancelBtn');

  let categories = loadCategories();
  let selectedCategory = categories[0] || null;
  let expenses = loadExpenses();

  const rupiah = new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
  });

  todayDateEl.textContent = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  function loadExpenses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveExpenses() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses)); } catch (e) {}
  }

  function loadCategories() {
    try {
      const raw = localStorage.getItem(CATEGORY_KEY);
      const stored = raw ? JSON.parse(raw) : null;
      return (stored && stored.length) ? stored : [...DEFAULT_CATEGORIES];
    } 
    catch (e) {
      return [...DEFAULT_CATEGORIES];
    }
  }

  function saveCategories() {
    try { localStorage.setItem(CATEGORY_KEY, JSON.stringify(categories)); } catch (e) {}
  }

  function getColor(cat) {
    const idx = categories.indexOf(cat);
    return PALETTE[(idx < 0 ? 0 : idx) % PALETTE.length];
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCategories() {
    categoryScroll.innerHTML = '';
    categories.forEach(cat => {
      const tipe = document.createElement('button');
      tipe.type = 'button';
      tipe.className = 'tipe' + (cat === selectedCategory ? ' active' : '');
      tipe.innerHTML = `<span class="dot" style="background:${getColor(cat)}"></span>${escapeHtml(cat)}`;
      tipe.addEventListener('click', () => {
        selectedCategory = cat;
        renderCategories();
      });
      categoryScroll.appendChild(tipe);
    });

    const addtipe = document.createElement('button');
    addtipe.type = 'button';
    addtipe.className = 'tipe tipe-add';
    addtipe.textContent = '+ Kategori';
    addtipe.addEventListener('click', openCategoryModal);
    categoryScroll.appendChild(addtipe);
  }

  function openCategoryModal() {
    newCategoryInput.value = '';
    categoryModalOverlay.classList.add('open');
    newCategoryInput.focus();
  }

  function closeCategoryModal() {
    categoryModalOverlay.classList.remove('open');
  }

  function confirmNewCategory() {
    const name = newCategoryInput.value.trim();
    if (!name) { closeCategoryModal(); return; }

    const existing = categories.find(c => c.toLowerCase() === name.toLowerCase());
    if (existing) {
      selectedCategory = existing;
    } else {
      categories.push(name);
      selectedCategory = name;
      saveCategories();
    }
    renderCategories();
    renderAll();
    closeCategoryModal();
  }

  confirmBtn.addEventListener('click', confirmNewCategory);
  cancelBtn.addEventListener('click', closeCategoryModal);
  categoryModalOverlay.addEventListener('click', (e) => {
    if (e.target === categoryModalOverlay) closeCategoryModal();
  });
  newCategoryInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmNewCategory(); }
    else if (e.key === 'Escape') { closeCategoryModal(); }
  });

  function groupByDate(list) {
    const groups = {};
    const order = [];
    list.forEach(item => {
      if (!groups[item.dateKey]) {
        groups[item.dateKey] = { label: item.dateLabel, items: [] };
        order.push(item.dateKey);
      }
      groups[item.dateKey].items.push(item);
    });
    return order.sort((a, b) => b.localeCompare(a)).map(k => groups[k]);
  }

  function renderTransactions() {
    transactionListEl.innerHTML = '';

    if (expenses.length === 0) {
      emptyState.style.display = 'block';
      return;
    }
    emptyState.style.display = 'none';

    const groups = groupByDate(expenses);
    groups.forEach(group => {
      const groupEl = document.createElement('div');
      groupEl.className = 'date-group';

      const header = document.createElement('div');
      header.className = 'date-header';
      header.textContent = group.label;
      groupEl.appendChild(header);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'date-rows';

      group.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'tx-row';
        row.innerHTML = `
          <span class="tx-cat" style="background:${getColor(item.category)}">${escapeHtml(item.category)}</span>
          <span class="tx-notes">${escapeHtml(item.notes || '—')}</span>
          <span class="tx-amount-wrap">
            <span class="tx-amount">${rupiah.format(item.amount)}</span>
            <button class="tx-del" type="button" aria-label="Hapus catatan">×</button>
          </span>
        `;
        row.querySelector('.tx-del').addEventListener('click', () => removeExpense(item.id));
        rowsWrap.appendChild(row);
      });

      groupEl.appendChild(rowsWrap);
      transactionListEl.appendChild(groupEl);
    });
  }

  function renderTotal() {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    totalAmountEl.textContent = rupiah.format(total);
    itemCountEl.textContent = `${expenses.length} transaksi tercatat`;
  }

  function renderAll() {
    renderTransactions();
    renderTotal();
  }

  function addExpense(category, amount, notes) {
    const now = new Date();
    expenses.unshift({
      id: Date.now() + Math.random().toString(16).slice(2),
      category,
      amount,
      notes,
      dateKey: now.toISOString().slice(0, 10),
      dateLabel: now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    });
    saveExpenses();
    renderAll();
  }

  function removeExpense(id) {
    expenses = expenses.filter(item => item.id !== id);
    saveExpenses();
    renderAll();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const amount = parseInt(amountInput.value, 10);
    const notes = notesInput.value.trim();

    if (!selectedCategory) {
      errorMsg.textContent = 'Pilih atau tambahkan kategori dulu.';
      return;
    }
    if (!amount || amount <= 0 || isNaN(amount)) {
      errorMsg.textContent = 'Nominal harus lebih dari 0.';
      amountInput.focus();
      return;
    }

    errorMsg.textContent = '';
    addExpense(selectedCategory, amount, notes);
    form.reset();
    amountInput.focus();
  });

  renderCategories();
  renderAll();
})();
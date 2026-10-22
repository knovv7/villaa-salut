// Villa Salut — estado do carrinho, compartilhado entre a loja (index.html) e o checkout.
// Guarda só { id do produto: quantidade } no navegador. Nome, imagem e preço sempre vêm do catálogo,
// então um preço alterado no catalog.js vale também para quem já tinha o produto no carrinho.
(function () {
  const KEY = 'vs-cart';
  const MAX_QTY = 99;
  const listeners = new Set();
  let lines = load();

  // quantidade válida: inteiro de 1 a 99; qualquer outra coisa é descartada
  function cleanQty(value) {
    const n = Math.floor(Number(value));
    return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_QTY) : 0;
  }

  // só aceita produtos que existem no catálogo e quantidades válidas
  function sanitize(raw) {
    const out = {};
    if (raw && typeof raw === 'object') {
      for (const [id, qty] of Object.entries(raw)) {
        const q = cleanQty(qty);
        if (q && window.Catalog.get(id)) out[id] = q;
      }
    }
    return out;
  }

  function load() {
    try { return sanitize(JSON.parse(localStorage.getItem(KEY) || '{}')); }
    catch { return {}; }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch {}
    listeners.forEach(fn => fn());
  }

  // outra aba (ou o checkout) mudou o carrinho
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return;
    lines = load();
    listeners.forEach(fn => fn());
  });

  window.Cart = {
    MAX_QTY,
    // soma ao que já existe em vez de duplicar a linha
    add(id, qty = 1) {
      if (!window.Catalog.get(id)) return false;
      const next = cleanQty((lines[id] || 0) + cleanQty(qty));
      if (!next) return false;
      lines[id] = next;
      save();
      return true;
    },
    setQty(id, qty) {
      const q = cleanQty(qty);
      if (!lines[id] || !q) return false;
      lines[id] = q;
      save();
      return true;
    },
    remove(id) {
      if (!lines[id]) return;
      delete lines[id];
      save();
    },
    clear() { lines = {}; save(); },
    items() {
      return Object.entries(lines).map(([id, qty]) => {
        const product = window.Catalog.get(id);
        return { product, qty, total: product.price * qty };
      });
    },
    count: () => Object.values(lines).reduce((a, b) => a + b, 0),
    subtotal: () => Object.entries(lines).reduce((sum, [id, qty]) => sum + window.Catalog.get(id).price * qty, 0),
    // revalida tudo antes do checkout: produto existe, quantidade é inteira e dentro do limite
    validate() {
      const problems = [];
      for (const [id, qty] of Object.entries(lines)) {
        if (!window.Catalog.get(id)) problems.push(`produto indisponível: ${id}`);
        else if (cleanQty(qty) !== qty) problems.push(`quantidade inválida em ${window.Catalog.get(id).name}`);
      }
      if (!Object.keys(lines).length) problems.push('o carrinho está vazio');
      return problems;
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
})();

// Villa Salut — cabeçalho funcional: busca, detalhes do produto, carrinho, favoritos e conta.
// Tudo lê catalog.js (Catalog) e cart.js (Cart): não existe outra lista de produtos ou de preços.
// Usa $, $$, store e showToast do script.js.
(() => {
  const fmt = Catalog.formatPrice;
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const icon = (id) => `<svg aria-hidden="true"><use href="#${id}"/></svg>`;

  /* ---------- painéis: <dialog> nativo (Esc, foco preso, camada acima de tudo) ---------- */
  const sheets = new Map($$('dialog.sheet').map(d => [d.id, d]));
  const openers = new WeakMap();
  const menu = $('#menu-mobile');
  const menuBtn = $('.menu-btn');

  function openSheet(id, trigger) {
    const dialog = sheets.get(id);
    if (!dialog) return;
    if (!menu.hidden) menuBtn.click();
    // trocar de painel (busca → produto, carrinho → produto) mantém quem abriu o primeiro,
    // pra o foco voltar pro ícone certo do cabeçalho no fim
    const previous = [...sheets.values()].find(d => d.open && d !== dialog);
    const origin = previous ? openers.get(previous) : (trigger || document.activeElement);
    if (previous) { previous.dataset.switching = '1'; previous.close(); }
    if (!dialog.open) {
      openers.set(dialog, origin);
      dialog.showModal();
    }
    document.documentElement.classList.add('has-sheet');
    dialog.dispatchEvent(new Event('sheet:open'));
  }

  sheets.forEach(dialog => {
    dialog.addEventListener('close', () => {
      const switching = dialog.dataset.switching;
      delete dialog.dataset.switching;
      if (![...sheets.values()].some(d => d.open)) document.documentElement.classList.remove('has-sheet');
      if (!switching) openers.get(dialog)?.focus?.({ preventScroll: true });
    });
    // clique no fundo escuro fecha
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    // Esc fecha sempre de primeira (num campo de busca com texto, o navegador gastaria o Esc apagando o texto)
    dialog.addEventListener('keydown', e => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      dialog.close();
    });
    $$('[data-close]', dialog).forEach(btn => btn.addEventListener('click', () => dialog.close()));
  });
  $$('[data-open]').forEach(btn => btn.addEventListener('click', () => openSheet(btn.dataset.open, btn)));

  /* ---------- cards: nome, descrição e preço vêm do catálogo ---------- */
  $$('.card[data-product]').forEach(card => {
    const p = Catalog.get(card.dataset.product);
    if (!p) return;
    $('.card__title', card).innerHTML = `<button type="button" class="card__link" data-show="${p.id}">${esc(p.name)}</button>`;
    $('.card__desc', card).textContent = p.description;
    $('.price', card).textContent = fmt(p.price);
    $('.add', card).setAttribute('aria-label', `adicionar ${p.name} ao carrinho`);
    $('.card__img img', card).dataset.show = p.id;
  });

  /* ---------- carrinho ---------- */
  const badge = $('[data-cart-count]');
  const cartBtn = $('.cart-btn');
  const cartList = $('[data-cart-list]');
  let shownCount = Cart.count();

  function renderBadge() {
    const n = Cart.count();
    badge.textContent = n;
    cartBtn.setAttribute('aria-label', `carrinho, ${plural(n, 'item', 'itens')}`);
    if (n > shownCount) {
      badge.classList.remove('bump');
      void badge.offsetWidth;
      badge.classList.add('bump');
    }
    shownCount = n;
  }

  function renderCart() {
    const items = Cart.items();
    $('[data-cart-heading]').textContent = items.length ? `(${Cart.count()})` : '';
    $('[data-cart-empty]').hidden = items.length > 0;
    $('[data-cart-foot]').hidden = !items.length;
    $('[data-cart-subtotal]').textContent = fmt(Cart.subtotal());
    cartList.innerHTML = items.map(({ product: p, qty, total }) => `
      <li class="line" data-line="${p.id}">
        <button class="line__img" type="button" data-show="${p.id}" aria-label="ver detalhes de ${esc(p.name)}"><img src="${p.image}" alt=""></button>
        <div class="line__info">
          <p class="line__name">${esc(p.name)}</p>
          <p class="line__unit">${fmt(p.price)} cada</p>
          <div class="line__row">
            <div class="qty qty--sm">
              <button type="button" data-dec aria-label="diminuir quantidade de ${esc(p.name)}" ${qty <= 1 ? 'disabled' : ''}>${icon('i-minus')}</button>
              <output aria-label="quantidade de ${esc(p.name)}">${qty}</output>
              <button type="button" data-inc aria-label="aumentar quantidade de ${esc(p.name)}" ${qty >= Cart.MAX_QTY ? 'disabled' : ''}>${icon('i-plus')}</button>
            </div>
            <button type="button" class="line__remove" data-remove aria-label="remover ${esc(p.name)} do carrinho">remover</button>
          </div>
        </div>
        <p class="line__total">${fmt(total)}</p>
      </li>`).join('');
  }

  // a lista é redesenhada a cada mudança; devolve o foco pro mesmo controle (ou o vizinho, se travou)
  function refocus(id, selector) {
    const line = cartList.querySelector(`[data-line="${id}"]`);
    const target = line && (line.querySelector(`${selector}:not(:disabled)`) || line.querySelector('[data-inc]:not(:disabled), [data-dec]:not(:disabled)'));
    (target || $('#carrinho-titulo')).focus?.();
  }

  cartList.addEventListener('click', e => {
    const line = e.target.closest('[data-line]');
    if (!line || e.target.closest('[data-show]')) return;
    const id = line.dataset.line;
    const current = Cart.items().find(i => i.product.id === id)?.qty || 0;
    if (e.target.closest('[data-inc]')) { Cart.setQty(id, current + 1); refocus(id, '[data-inc]'); }
    else if (e.target.closest('[data-dec]')) { Cart.setQty(id, current - 1); refocus(id, '[data-dec]'); }
    else if (e.target.closest('[data-remove]')) {
      const next = line.nextElementSibling?.dataset.line || line.previousElementSibling?.dataset.line;
      Cart.remove(id);
      showToast('removido do carrinho');
      next ? refocus(next, '[data-remove]') : $('[data-cart-empty] .btn')?.focus();
    }
  });

  // qualquer botão [data-add] coloca no carrinho o produto do contêiner [data-product] mais próximo
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    e.preventDefault();
    const p = Catalog.get(btn.closest('[data-product]')?.dataset.product);
    if (!p) return;
    const before = Cart.count();
    Cart.add(p.id);
    showToast(Cart.count() > before ? `${p.name} no carrinho` : `limite de ${Cart.MAX_QTY} unidades por produto`);
  });

  /* ---------- detalhes do produto ---------- */
  let pdpId = null, pdpQty = 1;
  const pdpQtyBox = $('[data-pdp-qty]');
  const renderPdpQty = () => {
    $('output', pdpQtyBox).textContent = pdpQty;
    $('[data-qty-dec]', pdpQtyBox).disabled = pdpQty <= 1;
    $('[data-qty-inc]', pdpQtyBox).disabled = pdpQty >= Cart.MAX_QTY;
  };

  function showProduct(id, trigger) {
    const p = Catalog.get(id);
    if (!p) return;
    pdpId = id;
    pdpQty = 1;
    const img = $('[data-pdp-img]');
    img.src = p.image;
    img.alt = p.name;
    $('[data-pdp-brand]').textContent = p.brand;
    $('[data-pdp-name]').textContent = p.name;
    $('[data-pdp-desc]').textContent = p.description;
    $('[data-pdp-cat]').textContent = p.category;
    $('[data-pdp-size]').textContent = p.size;
    $('[data-pdp-flavor]').textContent = p.flavor;
    $('[data-pdp-flavor-row]').hidden = !p.flavor;
    $('[data-pdp-price]').textContent = fmt(p.price);
    renderPdpQty();
    openSheet('produto', trigger);
  }

  $('[data-qty-dec]', pdpQtyBox).addEventListener('click', () => { pdpQty = Math.max(1, pdpQty - 1); renderPdpQty(); });
  $('[data-qty-inc]', pdpQtyBox).addEventListener('click', () => { pdpQty = Math.min(Cart.MAX_QTY, pdpQty + 1); renderPdpQty(); });
  $('[data-pdp-add]').addEventListener('click', () => {
    const p = Catalog.get(pdpId);
    if (!p || !Cart.add(p.id, pdpQty)) return;
    showToast(`${plural(pdpQty, 'unidade', 'unidades')} de ${p.name} no carrinho`);
    openSheet('carrinho');
  });

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-show]');
    if (el) showProduct(el.dataset.show, el);
  });

  /* ---------- favoritos (salvos no navegador, só ids do catálogo) ---------- */
  const FAV_KEY = 'vs-favs';
  const favs = new Set((() => {
    try { return JSON.parse(store.get(FAV_KEY) || '[]').filter(id => Catalog.get(id)); } catch { return []; }
  })());
  const favBtn = $('.fav-btn');
  const favList = $('[data-fav-list]');

  function renderFavs() {
    $$('.card[data-product]').forEach(card => {
      const on = favs.has(card.dataset.product);
      const btn = $('.fav', card);
      btn.setAttribute('aria-pressed', String(on));
      btn.setAttribute('aria-label', `${on ? 'remover dos' : 'salvar nos'} favoritos`);
    });
    favBtn.setAttribute('aria-label', `favoritos, ${plural(favs.size, 'produto', 'produtos')}`);
    favBtn.classList.toggle('has-favs', favs.size > 0);
    $('[data-fav-heading]').textContent = favs.size ? `(${favs.size})` : '';
    $('[data-fav-empty]').hidden = favs.size > 0;
    favList.innerHTML = [...favs].map(id => Catalog.get(id)).map(p => `
      <li class="line" data-line="${p.id}" data-product="${p.id}">
        <button class="line__img" type="button" data-show="${p.id}" aria-label="ver detalhes de ${esc(p.name)}"><img src="${p.image}" alt=""></button>
        <div class="line__info">
          <p class="line__name">${esc(p.name)}</p>
          <p class="line__unit">${fmt(p.price)}</p>
          <div class="line__row">
            <button type="button" class="btn btn--line line__btn" data-add>adicionar ao carrinho</button>
            <button type="button" class="line__remove" data-unfav aria-label="remover ${esc(p.name)} dos favoritos">remover</button>
          </div>
        </div>
      </li>`).join('');
  }

  function toggleFav(id) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    store.set(FAV_KEY, JSON.stringify([...favs]));
    renderFavs();
    return favs.has(id);
  }

  $$('.card[data-product] .fav').forEach(btn => btn.addEventListener('click', () => {
    showToast(toggleFav(btn.closest('[data-product]').dataset.product) ? 'salvo nos favoritos' : 'removido dos favoritos');
  }));
  favList.addEventListener('click', e => {
    const remove = e.target.closest('[data-unfav]');
    if (!remove) return;
    toggleFav(remove.closest('[data-line]').dataset.line);
    showToast('removido dos favoritos');
    $('#favoritos-titulo').focus?.();
  });

  /* ---------- busca: filtra o catálogo enquanto digita ---------- */
  const sInput = $('[data-search-input]');
  const sClear = $('[data-search-clear]');
  const sStatus = $('[data-search-status]');
  const sResults = $('[data-search-results]');
  const sIdle = $('[data-search-idle]');
  let sTimer = 0;

  $('[data-search-chips]').innerHTML = Catalog.categories()
    .map(c => `<button type="button" class="chip" data-chip="${esc(c)}">${esc(c)}</button>`).join('');

  function runSearch() {
    clearTimeout(sTimer);
    const q = sInput.value.trim();
    sResults.removeAttribute('aria-busy');
    if (!q) return;
    const found = Catalog.search(q);
    sResults.innerHTML = found.map(p => `
      <li><button type="button" class="result" data-show="${p.id}">
        <span class="result__img"><img src="${p.image}" alt=""></span>
        <span class="result__text">
          <span class="result__name">${esc(p.name)}</span>
          <span class="result__meta">${esc(p.brand)} · ${esc(p.category)}</span>
        </span>
        <span class="result__price">${fmt(p.price)}</span>
      </button></li>`).join('');
    sStatus.classList.toggle('is-empty', !found.length);
    sStatus.textContent = found.length
      ? plural(found.length, 'produto encontrado', 'produtos encontrados')
      : `nenhum produto encontrado para "${q}". tente o nome, a marca (ex.: max titanium) ou a categoria (ex.: creatina).`;
  }

  sInput.addEventListener('input', () => {
    const q = sInput.value.trim();
    sClear.hidden = !sInput.value;
    sIdle.hidden = !!q;
    clearTimeout(sTimer);
    sStatus.classList.remove('is-empty');
    if (!q) { sResults.innerHTML = ''; sStatus.textContent = ''; sResults.removeAttribute('aria-busy'); return; }
    sStatus.textContent = 'buscando…';
    sResults.setAttribute('aria-busy', 'true');
    sTimer = setTimeout(runSearch, 200); // espera a pessoa parar de digitar
  });
  sInput.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    runSearch();
    const first = Catalog.search(sInput.value)[0];
    if (first) showProduct(first.id, sInput);
  });
  sClear.addEventListener('click', () => {
    sInput.value = '';
    sInput.dispatchEvent(new Event('input'));
    sInput.focus();
  });
  $('[data-search-chips]').addEventListener('click', e => {
    const chip = e.target.closest('[data-chip]');
    if (!chip) return;
    sInput.value = chip.dataset.chip;
    sInput.dispatchEvent(new Event('input'));
    runSearch();
    sInput.focus();
  });
  sheets.get('busca').addEventListener('sheet:open', () => { sInput.focus(); sInput.select(); });

  /* ---------- conta do cliente (Auth em auth.js; sem provedor, nada é fingido) ---------- */
  const account = sheets.get('conta');
  const views = $$('[data-auth-view]', account);
  const alertBox = $('[data-auth-alert]', account);
  const titles = { signin: 'entrar', signup: 'criar conta', reset: 'recuperar senha', profile: 'minha conta' };
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  let currentView = 'signin';

  const rules = {
    email: (v) => !v ? 'digite seu e-mail.' : !EMAIL.test(v) ? 'esse e-mail não parece válido. confira se ficou assim: nome@exemplo.com' : '',
    name: (v) => v.length < 2 ? 'digite seu nome.' : '',
    password: (v, form) => {
      if (!v) return 'digite sua senha.';
      if (form.dataset.authView !== 'signup') return '';
      if (v.length < 8) return 'a senha precisa ter pelo menos 8 caracteres.';
      if (!/[a-z]/i.test(v) || !/\d/.test(v)) return 'use letras e números na senha.';
      return '';
    },
    confirm: (v, form) => !v ? 'repita a senha.' : v !== form.elements.password.value ? 'as senhas não são iguais.' : '',
  };

  function setError(input, message) {
    const form = input.form;
    const box = $(`[data-error-for="${input.name}"]`, form);
    if (!box.id) box.id = `${input.id}-erro`;
    box.textContent = message;
    input.setAttribute('aria-invalid', String(!!message));
    const described = (input.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== box.id);
    if (message) described.push(box.id);
    described.length ? input.setAttribute('aria-describedby', described.join(' ')) : input.removeAttribute('aria-describedby');
  }

  const check = (input) => {
    const message = rules[input.name] ? rules[input.name](input.value.trim(), input.form) : '';
    setError(input, message);
    return !message;
  };

  function showAlert(message, ok = false) {
    alertBox.textContent = message;
    alertBox.classList.toggle('is-ok', ok);
    alertBox.hidden = !message;
  }

  function showView(name) {
    currentView = name;
    views.forEach(v => { v.hidden = v.dataset.authView !== name; });
    $('[data-account-title]', account).textContent = titles[name];
    $('[data-auth-note]', account).hidden = Auth.configured || name === 'profile';
    showAlert('');
    if (name === 'profile') {
      const user = Auth.currentUser();
      $('[data-profile-name]', account).textContent = user?.name || 'cliente villa salut';
      $('[data-profile-email]', account).textContent = user?.email || '';
    }
  }

  const focusView = () => $(`[data-auth-view="${currentView}"] input, [data-auth-view="${currentView}"] button`, account)?.focus();

  account.addEventListener('sheet:open', () => {
    showView(Auth.currentUser() ? 'profile' : (currentView === 'profile' ? 'signin' : currentView));
    focusView();
  });
  $$('[data-auth-go]', account).forEach(btn => btn.addEventListener('click', () => { showView(btn.dataset.authGo); focusView(); }));

  $$('[data-toggle-pass]', account).forEach(btn => btn.addEventListener('click', () => {
    const input = btn.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    btn.setAttribute('aria-pressed', String(show));
    btn.setAttribute('aria-label', show ? 'ocultar senha' : 'mostrar senha');
    $('use', btn).setAttribute('href', show ? '#i-eye-off' : '#i-eye');
  }));

  async function busy(button, task) {
    const label = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.textContent = button.dataset.busyLabel;
    try { return await task(); }
    finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.textContent = label;
    }
  }

  $$('form[data-auth-view]', account).forEach(form => {
    const fields = $$('input', form);
    fields.forEach(input => {
      input.addEventListener('blur', () => { if (input.value) check(input); });
      input.addEventListener('input', () => { if (input.getAttribute('aria-invalid') === 'true') check(input); });
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      showAlert('');
      const invalid = fields.filter(input => !check(input));
      if (invalid.length) { invalid[0].focus(); return; }
      const v = Object.fromEntries(fields.map(i => [i.name, i.name.includes('pass') || i.name === 'confirm' ? i.value : i.value.trim()]));
      const submit = $('[type="submit"]', form);
      try {
        await busy(submit, () => {
          if (form.dataset.authView === 'signin') return Auth.signIn(v.email, v.password);
          if (form.dataset.authView === 'signup') return Auth.signUp({ name: v.name, email: v.email, password: v.password });
          return Auth.resetPassword(v.email);
        });
        if (form.dataset.authView === 'reset') {
          showAlert('pronto! se esse e-mail tiver uma conta, o link pra criar uma senha nova chega em instantes.', true);
        } else {
          form.reset();
          showView('profile');
          showToast('você entrou na sua conta');
          focusView();
        }
      } catch (err) {
        showAlert(err?.message || 'não foi possível concluir agora. tente de novo em instantes.');
        alertBox.focus?.();
      } finally {
        // senha nunca fica no campo depois de tentar
        $$('input[type="password"], input[name="password"], input[name="confirm"]', form).forEach(i => { i.value = ''; });
      }
    });
  });

  $('[data-auth-signout]', account).addEventListener('click', async e => {
    await busy(e.currentTarget, () => Auth.signOut());
    showView('signin');
    showToast('você saiu da sua conta');
    focusView();
  });

  /* ---------- liga tudo ---------- */
  const renderAll = () => { renderBadge(); renderCart(); };
  Cart.subscribe(renderAll);
  renderAll();
  renderFavs();

  // o checkout manda pra cá com #carrinho pra editar os itens
  if (location.hash === '#carrinho') {
    history.replaceState(null, '', location.pathname + location.search);
    openSheet('carrinho', cartBtn);
  }
})();

// villa salut — interações da home

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const store = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};

// intro: espera a fonte da marca antes de montar, senão a letra muda de forma sob a câmera
const portal = $('[data-glyph-portal]');
if (portal && window.mountGlyphPortal) {
  const word = 'Villa Salut';
  const mount = () => window.mountGlyphPortal(portal, {
    word,
    fontFamily: '"DM Serif Display", Georgia, serif',
    fontWeight: 400,
    scrollLength: 2.6,
  });
  const timeout = new Promise(resolve => setTimeout(resolve, 1600));
  Promise.race([document.fonts.load('400 100px "DM Serif Display"', word), timeout]).then(mount, mount);
}

// hero: potes girando em roda, passando um por trás do outro, cada um com halo e sombra próprios
const orbit = $('[data-orbit]');
if (orbit) {
  const items = $$('.orbit__item', orbit);
  const glows = $$('.orbit__glow', orbit);
  const shadows = $$('.orbit__shadow', orbit);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const turn = 18000; // ms por volta completa
  let W = 0, H = 0, front = 0;
  let angle = Math.PI / 2, speed = 1, last = 0, raf = 0, visible = true, hovering = false, fadeIn = 0;

  // a cor de cada pote (data-glow) vale pro halo, pra sombra no chão e pro brilho em volta do recorte
  items.forEach((el, i) => {
    glows[i].style.setProperty('--glow', el.dataset.glow);
    shadows[i].style.setProperty('--glow', el.dataset.glow);
  });

  const measure = () => {
    W = orbit.clientWidth;
    H = orbit.clientHeight;
    front = Math.min(W * 0.38, H * 0.55, 330); // largura do pote da frente; acima de ~330px a foto borra
    items.forEach(el => { el.style.width = `${front}px`; el.dataset.d = ''; });
    glows.forEach(g => { g.style.width = `${front * 2.7}px`; g.style.height = `${front * 3.1}px`; });
    shadows.forEach(s => { s.style.width = `${front * 1.2}px`; s.style.height = `${front * 0.3}px`; });
  };

  const place = () => {
    // Raio grande o bastante pra dois potes na mesma profundidade não se encostarem:
    // é ali que a camada troca, e com sobreposição parecia um atravessar o outro.
    const rx = Math.min(front * 0.8, W / 2 - front * 0.79 / 2 - 12), lift = H * 0.11;
    const fade = still.matches ? 1 : fadeIn;
    items.forEach((el, i) => {
      const theta = angle + (i * Math.PI * 2) / items.length;
      const depth = (Math.sin(theta) + 1) / 2; // 1 = frente, 0 = fundo
      const scale = 0.58 + 0.42 * depth;
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = W / 2 + Math.cos(theta) * rx;
      const floor = H / 2 + front * (h / w) / 2 - (1 - depth) * lift;
      const cy = floor - (h * scale) / 2; // centro visual do pote já escalado
      el.style.transform = `translate3d(${x - w / 2}px, ${floor - h}px, 0) scale(${scale}) rotate(${Math.cos(theta) * 2}deg)`; // inclina pra fora, longe do vizinho
      el.style.zIndex = String(1 + Math.round(depth * 100));

      // Filtro em degraus: redesenhar drop-shadow todo frame pesa. Sombra projetada pra baixo
      // e à direita (luz vem do alto à esquerda) cai sobre o pote de trás; brilho fino da cor do pote.
      const d = (Math.round(depth * 40) / 40).toFixed(3);
      if (el.dataset.d !== d) {
        el.dataset.d = d;
        const k = +d;
        el.style.filter = `saturate(${0.8 + 0.2 * k}) brightness(${0.94 + 0.06 * k})`
          + ` drop-shadow(${(6 + 6 * k).toFixed(1)}px ${(10 + 10 * k).toFixed(1)}px ${(12 + 10 * k).toFixed(1)}px rgba(18, 28, 36, ${(0.14 + 0.14 * k).toFixed(3)}))`
          + ` drop-shadow(0 0 ${(5 + 4 * k).toFixed(1)}px rgba(${el.dataset.glow}, ${(0.06 + 0.1 * k).toFixed(3)}))`;
      }

      // halo: mesmo centro e mesma escala do pote no mesmo frame, mais intenso quando ele vem pra frente
      const g = glows[i], gw = front * 2.7, gh = front * 3.1;
      g.style.transform = `translate3d(${x - gw / 2}px, ${cy - gh / 2}px, 0) scale(${scale})`;
      g.style.opacity = ((0.5 + 0.5 * depth) * fade).toFixed(3);

      // sombra de contato no chão do pote, um pouco à direita
      const s = shadows[i], sw = front * 1.2, sh = front * 0.3;
      s.style.transform = `translate3d(${x - sw / 2 + w * scale * 0.07}px, ${floor - sh / 2}px, 0) scale(${scale})`;
      s.style.opacity = ((0.55 + 0.45 * depth) * fade).toFixed(3);
    });
  };

  const tick = (now) => {
    raf = 0;
    const dt = last ? Math.min(now - last, 64) : 0;
    last = now;
    fadeIn = Math.min(1, fadeIn + dt / 700); // luz e sombra entram junto com os potes
    speed += ((hovering ? 0.25 : 1) - speed) * 0.06; // desacelera suave com o mouse em cima
    angle += (dt / turn) * Math.PI * 2 * speed;
    place();
    if (visible && !still.matches) raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!raf && visible && !still.matches) { last = 0; raf = requestAnimationFrame(tick); } };

  orbit.addEventListener('pointerenter', () => { hovering = true; });
  orbit.addEventListener('pointerleave', () => { hovering = false; });
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
  }).observe(orbit);
  new ResizeObserver(() => { measure(); place(); }).observe(orbit);
  still.addEventListener('change', () => { place(); start(); });

  Promise.all(items.map(el => $('img', el).decode().catch(() => {}))).then(() => {
    measure();
    place();
    orbit.classList.add('is-ready');
    start();
  });
}

// toast
const toast = $('[data-toast]');
let toastTimer;
function showToast(msg) {
  // popover põe o aviso na camada mais alta, acima dos painéis abertos do cabeçalho
  if (toast.showPopover) { if (toast.matches(":popover-open")) toast.hidePopover(); toast.showPopover(); }
  toast.textContent = msg;
  toast.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
}

// header com linha ao rolar
const header = $('.header');
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// menu mobile
const menuBtn = $('.menu-btn');
const menu = $('#menu-mobile');
menuBtn.addEventListener('click', () => {
  const open = menu.hidden;
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.setAttribute('aria-label', open ? 'fechar menu' : 'abrir menu');
  $('use', menuBtn).setAttribute('href', open ? '#i-close' : '#i-menu');
});
$$('a', menu).forEach(a => a.addEventListener('click', () => menuBtn.click()));

// carrinho, favoritos, busca e conta ficam em shop.js, todos lendo o catalog.js

// carrossel de categorias
const track = $('[data-carousel]');
const step = () => track.firstElementChild.getBoundingClientRect().width + 10;
$('[data-carousel-next]').addEventListener('click', () => track.scrollBy({ left: step(), behavior: 'smooth' }));
$('[data-carousel-prev]').addEventListener('click', () => track.scrollBy({ left: -step(), behavior: 'smooth' }));

// sabores do lançamento: o sabor escolhido vira o produto que "comprar agora" coloca no carrinho
const launch = $('.launch__inner');
const launchImg = $('[data-launch-img]');
const launchMini = $('[data-launch-mini]');
const launchName = $('[data-launch-name]');
const launchPrice = $('[data-launch-price]');
const showLaunchPrice = () => { launchPrice.textContent = Catalog.formatPrice(Catalog.get(launch.dataset.product).price); };
showLaunchPrice();
$$('.flavor').forEach(btn => btn.addEventListener('click', () => {
  if (btn.classList.contains('is-on')) return;
  $$('.flavor').forEach(b => { b.classList.remove('is-on'); b.setAttribute('aria-checked', 'false'); });
  btn.classList.add('is-on');
  btn.setAttribute('aria-checked', 'true');
  launch.dataset.product = btn.dataset.product;
  showLaunchPrice();
  launchImg.classList.add('is-swapping');
  setTimeout(() => {
    launchImg.src = btn.dataset.img;
    launchImg.alt = `pote de Juicedop clear whey ${btn.dataset.name}`;
    launchMini.src = btn.dataset.img;
    launchName.textContent = btn.dataset.name;
    launchImg.classList.remove('is-swapping');
  }, 250);
}));

// depoimentos: carrossel escalonado (porte em JS puro do componente StaggerTestimonials)
const stagger = $('[data-stagger]');
if (stagger) {
  const cards = $$('.stagger__card', stagger);
  const live = $('[data-stagger-live]', stagger);
  const order = cards.slice(); // ordem na tela; o do meio é o destaque
  const pos = new Map();       // posição de cada card no último desenho
  const cardSize = () => (window.matchMedia('(min-width: 640px)').matches ? 365 : 290);
  const mid = Math.floor(order.length / 2);
  for (let i = 0; i < mid; i++) order.unshift(order.pop()); // começa com o primeiro depoimento no centro

  function layout(animate = true) {
    const size = cardSize();
    stagger.style.setProperty('--card', `${size}px`);
    order.forEach((card, i) => {
      const p = i - mid;
      const prev = pos.get(card);
      // quem dá a volta de uma ponta pra outra pula sem animar, senão atravessaria a tela
      const jump = !animate || (prev !== undefined && Math.abs(p - prev) > order.length / 2);
      const center = p === 0;
      if (jump) card.style.transition = 'none';
      card.style.transform = `translate(-50%, -50%) translateX(${(size / 1.5) * p}px) translateY(${center ? -65 : p % 2 ? 15 : -15}px) rotate(${center ? 0 : p % 2 ? 2.5 : -2.5}deg)`;
      card.style.zIndex = String(center ? 10 : 5 - Math.abs(p));
      card.classList.toggle('is-center', center);
      card.setAttribute('aria-hidden', String(!center));
      if (jump) { void card.offsetWidth; card.style.transition = ''; }
      pos.set(card, p);
    });
    const current = order[mid];
    live.textContent = `depoimento ${cards.indexOf(current) + 1} de ${cards.length}: ${$('blockquote', current).textContent} — ${$('.stagger__by', current).textContent}`;
  }

  // passa sozinho; para com o mouse em cima, depois de um clique/toque dentro (até clicar fora),
  // fora da tela, com a aba escondida, com movimento reduzido ou pelo botão de pausa
  const AUTO_MS = 4500;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const pauseBtn = $('[data-stagger-pause]', stagger);
  let autoTimer = 0, hovering = false, engaged = false, onScreen = false, userPaused = false;
  const canPlay = () => !hovering && !engaged && !userPaused && onScreen && !document.hidden && !still.matches;

  function schedule() {
    clearTimeout(autoTimer);
    stagger.dataset.auto = canPlay() ? 'on' : 'off';
    if (canPlay()) autoTimer = setTimeout(() => move(1, true), AUTO_MS);
  }

  function move(steps, auto = false) {
    if (!steps) return;
    for (let i = 0; i < Math.abs(steps); i++) steps > 0 ? order.push(order.shift()) : order.unshift(order.pop());
    // troca automática não fica anunciando no leitor de tela; troca pedida pela pessoa sim
    live.setAttribute('aria-live', auto ? 'off' : 'polite');
    layout();
    schedule(); // cada troca reinicia a contagem
  }

  stagger.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') { hovering = true; schedule(); } });
  stagger.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') { hovering = false; schedule(); } });
  stagger.addEventListener('focusin', () => { engaged = true; schedule(); });
  stagger.addEventListener('focusout', e => { if (!stagger.contains(e.relatedTarget)) { engaged = false; schedule(); } });
  stagger.addEventListener('pointerdown', () => { engaged = true; schedule(); });
  document.addEventListener('pointerdown', e => { if (engaged && !stagger.contains(e.target)) { engaged = false; schedule(); } });
  document.addEventListener('visibilitychange', schedule);
  still.addEventListener('change', schedule);
  new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(stagger);

  pauseBtn.addEventListener('click', () => {
    userPaused = !userPaused;
    pauseBtn.setAttribute('aria-pressed', String(userPaused));
    pauseBtn.setAttribute('aria-label', userPaused ? 'continuar a passagem automática' : 'pausar a passagem automática');
    $('use', pauseBtn).setAttribute('href', userPaused ? '#i-play' : '#i-pause');
    schedule();
  });

  // arrastar com o dedo pro lado também troca; o toque que vira arraste não conta como clique no card
  let startX = null, swipedAt = 0;
  stagger.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') startX = e.clientX; });
  stagger.addEventListener('pointerup', e => {
    if (startX === null) return;
    const dx = e.clientX - startX;
    startX = null;
    if (Math.abs(dx) > 40) { swipedAt = Date.now(); move(dx < 0 ? 1 : -1); }
  });
  stagger.addEventListener('pointercancel', () => { startX = null; });

  cards.forEach(card => card.addEventListener('click', () => {
    if (Date.now() - swipedAt < 400) return;
    move(pos.get(card));
  }));
  $('[data-stagger-prev]', stagger).addEventListener('click', () => move(-1));
  $('[data-stagger-next]', stagger).addEventListener('click', () => move(1));
  stagger.addEventListener('keydown', e => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    move(e.key === 'ArrowRight' ? 1 : -1);
  });
  window.addEventListener('resize', () => layout(false));

  stagger.classList.add('is-live');
  layout(false);
  schedule();
}

// pop-up de newsletter: aparece uma vez, depois de 40% da página ou 12s
const modal = $('[data-modal]');
let lastFocus;
function openModal() {
  // não interrompe quem está com a busca, o carrinho ou a conta abertos
  if (!modal.hidden || store.get('vs-modal') || document.querySelector('dialog.sheet[open]')) return;
  store.set('vs-modal', '1');
  lastFocus = document.activeElement;
  modal.hidden = false;
  $('input', modal).focus();
}
function closeModal() {
  modal.hidden = true;
  lastFocus?.focus();
}
$$('[data-modal-close]', modal).forEach(el => el.addEventListener('click', closeModal));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) closeModal(); });

const modalTimer = setTimeout(openModal, 12000);
window.addEventListener('scroll', function trigger() {
  const ratio = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  if (ratio > 0.4) {
    clearTimeout(modalTimer);
    window.removeEventListener('scroll', trigger);
    openModal();
  }
}, { passive: true });

$$('[data-newsletter]').forEach(form => form.addEventListener('submit', e => {
  e.preventDefault();
  form.reset();
  store.set('vs-modal', '1');
  if (!modal.hidden) closeModal();
  showToast('pronto! seu cupom de 10% chega no e-mail');
}));

// entrada suave das seções
const io = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) {
    entry.target.classList.add('is-in');
    io.unobserve(entry.target);
  }
}), { threshold: 0.12 });
$$('.section, .launch__inner').forEach(el => { el.classList.add('reveal'); io.observe(el); });

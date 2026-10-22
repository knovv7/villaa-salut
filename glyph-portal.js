/**
 * Glyph Portal © 2026 Christian Katzmann. MIT.
 * Origin: UsefulPortal.astro on https://ktzm.dk → UsefulPortal.tsx → ClarityPortal.tsx.
 * A scroll-driven camera through live type. Keep this notice with copies.
 *
 * Porte para JavaScript puro (sem React) feito para o site villa salut.
 * A marcação fica no index.html (section[data-glyph-portal]) e o estilo em styles.css (.portal).
 * Diferenças do original: sem anotações e sem o <select> de toque; os botões de letra
 * são criados aqui e a letra escolhida ganha um sublinhado via CSS.
 */
(function () {
  const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
  const smooth = (a, b, n) => {
    const t = clamp((n - a) / (b - a));
    return t * t * (3 - 2 * t);
  };
  const DEFAULT_FONT = '"Arial Black", "Arial", sans-serif';

  // Maior quadrado opaco dentro da letra, em tempo linear. Funciona em O, S e Ø.
  function interior(context, char, font) {
    const canvas = context.canvas;
    context.font = font;
    const m = context.measureText(char);
    const pad = 8;
    const left = Math.ceil(m.actualBoundingBoxLeft);
    const ascent = Math.ceil(m.actualBoundingBoxAscent);
    canvas.width = Math.max(1, Math.ceil(m.actualBoundingBoxLeft + m.actualBoundingBoxRight) + pad * 2);
    canvas.height = Math.max(1, Math.ceil(m.actualBoundingBoxAscent + m.actualBoundingBoxDescent) + pad * 2);
    context.font = font;
    context.fontKerning = 'none';
    context.fillText(char, pad + left, pad + ascent);
    const { width, height } = canvas;
    const pixels = context.getImageData(0, 0, width, height).data;
    const rows = new Uint16Array(width + 1);
    let size = 0, bx = 0, by = 0;
    for (let y = 0; y < height; y++) {
      let diagonal = 0;
      for (let x = 0; x < width; x++) {
        const above = rows[x + 1];
        rows[x + 1] = pixels[(y * width + x) * 4 + 3] > 245
          ? Math.min(above, rows[x], diagonal) + 1 : 0;
        diagonal = above;
        if (rows[x + 1] > size) { size = rows[x + 1]; bx = x; by = y; }
      }
    }
    if (size < 3) return null;
    // Lido em 3× o tamanho do SVG. Um disco inscrito no quadrado, com folga para o raster.
    return {
      x: (bx + 1 - size / 2 - pad - left) / 3,
      y: (by + 1 - size / 2 - pad - ascent) / 3,
      radius: (size / 2 - 1) / 3,
    };
  }

  function scrollParent(element) {
    for (let p = element.parentElement; p; p = p.parentElement) {
      if (/(auto|scroll|hidden)/.test(getComputedStyle(p).overflowY) && p !== document.body && p !== document.documentElement) return p;
    }
    return null;
  }

  function mountGlyphPortal(section, options = {}) {
    const text = (options.word || 'SUBLIME').trim().normalize('NFC') || 'SUBLIME';
    const focusChar = options.focusChar;
    const interactive = options.interactive ?? true;
    const length = Number.isFinite(options.scrollLength) ? clamp(options.scrollLength, 1, 8) : 2.4;
    const weight = Number.isFinite(options.fontWeight) ? clamp(options.fontWeight, 1, 1000) : 900;
    const fontFamily = options.fontFamily || DEFAULT_FONT;
    const onProgress = options.onProgress;

    const pin = section.querySelector('[data-gp-pin]');
    const field = section.querySelector('[data-gp-field]');
    const art = section.querySelector('[data-gp-art]');
    const glyph = section.querySelector('[data-gp-glyph]');
    const clip = glyph.closest('clipPath');
    const clipId = clip.id;
    const choices = section.querySelector('[data-gp-choices]');
    const hasFront = !!section.querySelector('[data-gp-front]');

    // palavra, variáveis de CSS e um botão por letra
    const characters = [];
    let characterOffset = 0;
    for (const char of Array.from(text)) {
      characters.push({ char, index: characterOffset });
      characterOffset += char.length;
    }
    glyph.textContent = text;
    Object.assign(glyph.style, {
      fontFamily, fontWeight: String(weight), fontSize: '100px',
      fontKerning: 'none', fontVariantLigatures: 'none', letterSpacing: '0',
    });
    section.setAttribute('aria-label', text);
    section.style.setProperty('--gp-length', String(length));
    section.style.setProperty('--gp-characters', String(characters.length));
    choices.replaceChildren(...characters.map(({ char, index }, i) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.setAttribute('aria-label', `${char}, letra ${i + 1} de ${characters.length}`);
      button.tabIndex = -1;
      button.dataset.gpLetter = String(index);
      return button;
    }));
    const buttons = Array.from(choices.querySelectorAll('button'));

    const root = scrollParent(section);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });
    let disposed = false, raf = 0, dirty = true, active = true, ready = false;
    const mountedAt = performance.now();
    let browserFrameSeen = false, stalled = false;
    let W = 1, H = 1, travel = 1, startScale = 1, endScale = 1;
    let center = { x: 0, y: 0 }, target = null;
    let lastProgress = -1;
    let candidates = [], letters = [];
    let choosing = false;
    let bounds = { x: 0, y: 0, width: 1, height: 1 };
    let fontDirty = true;

    // Congela uma fonte disponível nesta montagem. Troca tardia de fonte mexeria na tinta sob a câmera.
    // Pré-carregue a fonte antes de montar; fontes pendentes ou com erro usam a pilha de reserva.
    const computedFamily = getComputedStyle(glyph).fontFamily;
    const families = computedFamily.match(/(?:[^,"']+|"[^"]*"|'[^']*')+/g) ?? [];
    const available = families.filter((family) => {
      try { return document.fonts.check(`${weight} 100px ${family.trim()}`, text); }
      catch { return false; }
    });
    glyph.style.fontFamily = [...available, DEFAULT_FONT].join(',');
    // Uma fonte pendente pode travar o loop de render do WebKit. Nesse caso a intro fica estática.
    stalled = available.length < families.length;

    const readInk = () => {
      if (!context) return false;
      const font = getComputedStyle(glyph);
      const scanFont = `${font.fontWeight} 300px ${font.fontFamily}`;
      context.font = `${font.fontWeight} 100px ${font.fontFamily}`;
      context.fontKerning = 'none';
      const metrics = context.measureText(text);
      const advances = Array.from({ length: text.length }, (_, i) => context.measureText(text.slice(0, i)).width);
      // O getBBox do SVG inclui a caixa de linha em alguns motores. Enquadra a tinta visível.
      bounds = {
        x: -metrics.actualBoundingBoxLeft, y: -metrics.actualBoundingBoxAscent,
        width: metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight,
        height: metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent,
      };
      if (!bounds.width || !bounds.height) return false;
      center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const requested = focusChar ? text.indexOf(focusChar.normalize('NFC')) : -1;
      let offset = 0;
      candidates = []; letters = [];
      for (const char of Array.from(text)) {
        context.font = `${font.fontWeight} 100px ${font.fontFamily}`;
        const m = context.measureText(char);
        letters.push({
          index: offset, x: advances[offset] - m.actualBoundingBoxLeft,
          y: -m.actualBoundingBoxAscent, width: m.actualBoundingBoxLeft + m.actualBoundingBoxRight,
          height: m.actualBoundingBoxAscent + m.actualBoundingBoxDescent,
        });
        const found = interior(context, char, scanFont);
        if (found) candidates.push({ ...found, x: found.x + advances[offset], index: offset });
        offset += char.length;
      }
      target = candidates.find((candidate) => candidate.index === requested)
        ?? [...candidates].sort((a, b) => b.radius - a.radius || Math.abs(a.x - center.x) - Math.abs(b.x - center.x))[0]
        ?? null;
      return true;
    };

    const select = (next) => {
      target = next;
      endScale = target ? Math.max(startScale, Math.hypot(W, H) / (target.radius * 1.35)) : startScale;
      section.dataset.gpFocus = target ? Array.from(text.slice(target.index))[0] : '';
      section.dataset.gpFocusIndex = String(target?.index ?? -1);
      for (const button of buttons) {
        const index = Number(button.dataset.gpLetter);
        const selected = index === target?.index;
        button.disabled = !candidates.some((candidate) => candidate.index === index);
        button.setAttribute('aria-checked', String(selected));
        button.tabIndex = selected ? 0 : -1;
      }
    };

    const position = () => {
      const origin = root ? root.getBoundingClientRect().top + root.clientTop : 0;
      return clamp((origin - section.getBoundingClientRect().top) / travel);
    };

    const paint = (progress) => {
      const isStatic = motion.matches || !browserFrameSeen || stalled || !target;
      const p = isStatic ? 0 : progress;
      const t = clamp(p / 0.78);
      const eased = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
      const scale = Math.exp(Math.log(startScale) + Math.log(endScale / startScale) * eased);
      const blend = endScale === startScale ? 0 : (1 / scale - 1 / startScale) / (1 / endScale - 1 / startScale);
      const cx = center.x + ((target?.x ?? center.x) - center.x) * blend;
      const cy = center.y + ((target?.y ?? center.y) - center.y) * blend;
      const roll = -4 * smooth(0.06, 0.5, t) * (1 - smooth(0.62, 0.92, t));
      // A escala fica no clip para evitar limites de pintura de texto. A translação local do
      // texto acompanha o zoom da página no WebKit; translação numa referência de clip HTML não.
      const radians = roll * Math.PI / 180;
      const dx = W / 2 / scale, dy = (H * 0.46 + H * 0.04 * eased) / scale;
      clip.setAttribute('transform', `scale(${scale}) rotate(${roll})`);
      glyph.setAttribute('transform', `translate(${Math.cos(radians) * dx + Math.sin(radians) * dy - cx} ${-Math.sin(radians) * dx + Math.cos(radians) * dy - cy})`);
      choosing = interactive && !isStatic && p < 0.04;
      choices.inert = !choosing;
      section.dataset.gpChoosing = String(choosing);
      // Só solta o clip depois que a câmera já encheu a tela de tinta.
      field.style.clipPath = t >= 1 ? 'none' : `url(#${clipId})`;
      section.style.setProperty('--gp-caption', String(1 - smooth(0.01, 0.16, p)));
      section.style.setProperty('--gp-reveal', String(isStatic ? 1 : smooth(0.78, 0.9, p)));
      section.style.setProperty('--gp-field-scale', String(1 + 0.16 * smooth(0, 0.82, p)));
      section.style.setProperty('--gp-caption-hit', p < 0.08 ? 'auto' : 'none');
      section.dataset.gpEntered = String(p >= 0.9);
      section.dataset.gpProgress = p.toFixed(5);
      if (p !== lastProgress) { lastProgress = p; onProgress?.(p); }
    };

    const layout = () => {
      if (!section.clientWidth) return;
      W = pin.clientWidth;
      // Uma sonda de 100svh evita que a barra do navegador mude a distância de rolagem o tempo todo.
      const smallViewport = section.querySelector('[data-gp-viewport]').offsetHeight;
      const viewportHeight = Math.max(1, Math.min(root?.clientHeight ?? smallViewport, smallViewport));
      H = motion.matches ? Math.min(viewportHeight * 0.75, 480) : viewportHeight;
      section.style.setProperty('--gp-height', `${H}px`);
      travel = H * length;
      art.setAttribute('viewBox', `0 0 ${W} ${H}`);
      if (fontDirty) { ready = readInk(); fontDirty = false; }
      if (!ready) return;
      const wordHeight = hasFront && H < 480 ? Math.min(H * 0.38, Math.max(24, H - 264)) : H * 0.38;
      startScale = Math.min(W * 0.84 / bounds.width, wordHeight / bounds.height);
      select(target);
      for (const button of buttons) {
        const letter = letters.find((item) => item.index === Number(button.dataset.gpLetter));
        Object.assign(button.style, {
          left: `${W / 2 + (letter.x - center.x) * startScale}px`,
          top: `${H * 0.46 + (letter.y - center.y) * startScale - Math.max(0, 44 - letter.height * startScale) / 2}px`,
          width: `${Math.max(1, letter.width * startScale)}px`,
          height: `${Math.max(44, letter.height * startScale)}px`,
        });
      }
      section.style.setProperty('--gp-word-top', `${H * 0.46 - bounds.height * startScale / 2}px`);
      section.style.setProperty('--gp-word-bottom', `${H * 0.46 + bounds.height * startScale / 2}px`);
      section.dataset.gpReady = 'true';
      section.dataset.gpMotion = !motion.matches && browserFrameSeen && !stalled && target ? 'on' : 'off';
    };

    const frame = (time) => {
      raf = 0;
      if (disposed) return;
      if (time !== undefined && !browserFrameSeen) {
        browserFrameSeen = true; stalled ||= performance.now() - mountedAt > 2500; dirty = true;
      }
      if (dirty) { dirty = false; layout(); }
      if (ready) paint(position());
    };
    const schedule = () => { if (!raf && active) raf = requestAnimationFrame(frame); };
    const resize = () => { cancelAnimationFrame(raf); dirty = true; frame(); };
    const scroll = () => schedule();
    const choose = (event) => {
      if (!choosing || position() >= 0.04) return;
      const button = event.target.closest('[data-gp-letter]');
      const next = candidates.find((candidate) => candidate.index === Number(button?.dataset.gpLetter));
      if (!next || next === target) return;
      select(next); paint(position());
    };
    const navigate = (event) => {
      if (!choosing || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = candidates.indexOf(target);
      const index = event.key === 'Home' ? 0 : event.key === 'End' ? candidates.length - 1
        : (current + (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1) + candidates.length) % candidates.length;
      buttons.find((button) => Number(button.dataset.gpLetter) === candidates[index].index)?.focus({ preventScroll: true });
    };
    choices.addEventListener('pointerover', choose);
    choices.addEventListener('click', choose);
    choices.addEventListener('focusin', choose);
    choices.addEventListener('keydown', navigate);
    const observer = new ResizeObserver(resize);
    observer.observe(section);
    if (root) observer.observe(root);
    const visibility = new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      if (active) { dirty = true; schedule(); }
      else if (raf) { cancelAnimationFrame(raf); raf = 0; }
    }, { root, rootMargin: '100% 0px' });
    visibility.observe(section);
    (root ?? window).addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    window.visualViewport?.addEventListener('resize', resize);
    motion.addEventListener('change', resize);
    frame();
    // O WebKit pode segurar frames, timers e scroll atrás de uma fonte travada no começo.
    // Começa no fluxo de leitura e só liga o movimento quando o navegador renderiza logo.
    schedule();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      (root ?? window).removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
      window.visualViewport?.removeEventListener('resize', resize);
      motion.removeEventListener('change', resize);
      choices.removeEventListener('pointerover', choose);
      choices.removeEventListener('click', choose);
      choices.removeEventListener('focusin', choose);
      choices.removeEventListener('keydown', navigate);
    };
  }

  window.mountGlyphPortal = mountGlyphPortal;
})();

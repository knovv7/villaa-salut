// Villa Salut — checkout, etapa 1: resumo do pedido.
// Lê o mesmo carrinho (cart.js) e o mesmo catálogo (catalog.js) da loja e revalida tudo.
//
// Ainda não existe pagamento: o botão de continuar fica desativado e nenhum pedido é criado.
// Pra ativar, o site precisa de um backend que:
//   1. receba o carrinho e recalcule os preços no servidor (nunca confie no preço vindo do navegador);
//   2. calcule o frete pelo CEP (Correios ou transportadora);
//   3. crie a cobrança num gateway (ex.: Mercado Pago, PagSeguro, Pagar.me ou Stripe) com as
//      credenciais guardadas só no servidor, e confirme o pagamento pelo webhook do gateway.
(() => {
  const $ = (sel) => document.querySelector(sel);
  const fmt = Catalog.formatPrice;
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function render() {
    const items = Cart.items();
    const problems = Cart.validate().filter(p => p !== 'o carrinho está vazio');
    $('[data-co-empty]').hidden = items.length > 0;
    $('[data-co-edit]').hidden = !items.length;
    $('[data-co-count]').textContent = items.length ? `(${Cart.count()})` : '';
    $('[data-co-subtotal]').textContent = items.length ? fmt(Cart.subtotal()) : '—';
    $('[data-co-list]').innerHTML = items.map(({ product: p, qty, total }) => `
      <li class="line">
        <span class="line__img"><img src="${p.image}" alt=""></span>
        <div class="line__info">
          <p class="line__name">${esc(p.name)}</p>
          <p class="line__unit">${qty} × ${fmt(p.price)}</p>
        </div>
        <p class="line__total">${fmt(total)}</p>
      </li>`).join('');
    const box = $('[data-co-problems]');
    box.hidden = !problems.length;
    box.textContent = problems.length ? `revise o carrinho antes de continuar: ${problems.join('; ')}.` : '';
  }

  Cart.subscribe(render); // carrinho mudou em outra aba
  render();
})();

// Villa Salut — catálogo único da loja.
// Cards, busca, detalhes do produto, carrinho e checkout leem daqui: preço e nome só mudam neste arquivo.
// Preços em centavos. Os valores são os que já estavam no site (ainda provisórios, ver memoria.md).
(function () {
  const products = [
    {
      id: 'juicedop-tangerina', line: 'Juicedop', brand: 'Elemento Puro', category: 'clear whey',
      name: 'Juicedop Clear Whey · tangerina + chá branco', flavor: 'tangerina + chá branco', size: '450 g',
      description: 'whey isolado com jeito de suco, leve e refrescante',
      price: 15990, image: 'assets/produtos/juicedop-tangerina.png',
    },
    {
      id: 'juicedop-limao-matcha', line: 'Juicedop', brand: 'Elemento Puro', category: 'clear whey',
      name: 'Juicedop · limão + matchá', flavor: 'limão + matchá', size: '450 g',
      description: 'clear whey 100% isolado, 450 g',
      price: 15990, image: 'assets/juicedop/juicedop-limao-matcha.png',
    },
    {
      id: 'juicedop-morango-hibisco', line: 'Juicedop', brand: 'Elemento Puro', category: 'clear whey',
      name: 'Juicedop · morango + hibisco', flavor: 'morango + hibisco', size: '450 g',
      description: 'clear whey 100% isolado, 450 g',
      price: 15990, image: 'assets/juicedop/juicedop-morango-hibisco.png',
    },
    {
      id: 'juicedop-manga-crazy', line: 'Juicedop', brand: 'Elemento Puro', category: 'clear whey',
      name: 'Juicedop · manga crazy', flavor: 'manga crazy', size: '450 g',
      description: 'edição limitada, 450 g',
      price: 16490, image: 'assets/juicedop/juicedop-manga-crazy.png',
    },
    {
      id: 'juicedop-melon-fresh', line: 'Juicedop', brand: 'Elemento Puro', category: 'clear whey',
      name: 'Juicedop · melon fresh', flavor: 'melon fresh', size: '450 g',
      description: 'clear whey 100% isolado, 450 g',
      price: 15990, image: 'assets/juicedop/juicedop-melon-fresh.png',
    },
    {
      id: 'creatina-max', line: 'Creatine', brand: 'Max Titanium', category: 'creatina',
      name: 'Creatine · Max Titanium', flavor: '', size: '300 g',
      description: 'creatina monohidratada em pó, 300 g',
      price: 11990, image: 'assets/produtos/creatina-max.png',
    },
    {
      id: '100-beef', line: '100% Beef', brand: 'Adaptogen', category: 'proteínas',
      name: '100% Beef · Adaptogen', flavor: 'chocolate', size: '900 g',
      description: 'proteína da carne, sabor chocolate, 900 g',
      price: 14990, image: 'assets/produtos/100-beef.png',
    },
    {
      id: 'super-colageno', line: 'Super Colágeno', brand: 'Super Nutrition', category: 'colágeno',
      name: 'Super Colágeno · Invisible', flavor: 'neutro', size: '200 g',
      description: 'colágeno com vitaminas, sem sabor e sem lactose',
      price: 7990, image: 'assets/produtos/super-colageno.png',
    },
  ];

  const byId = new Map(products.map(p => [p.id, p]));
  const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  // sem acento e em minúsculas: "colageno" acha "colágeno"
  const fold = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  const haystack = new Map(products.map(p => [p.id, fold([p.name, p.line, p.brand, p.category, p.flavor].join(' '))]));

  window.Catalog = {
    all: () => products.slice(),
    get: (id) => byId.get(id) || null,
    categories: () => [...new Set(products.map(p => p.category))],
    formatPrice: (cents) => money.format(cents / 100),
    // todas as palavras digitadas precisam aparecer em nome, linha, marca, categoria ou sabor
    search(query) {
      const words = fold(query).split(/\s+/).filter(Boolean);
      if (!words.length) return [];
      return products.filter(p => words.every(w => haystack.get(p.id).includes(w)));
    },
  };
})();

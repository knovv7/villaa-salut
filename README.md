# Villa Salut — site

Loja de saúde e vida fitness da Villa Salut. É um site estático (HTML, CSS e JavaScript puro): não precisa instalar nada nem rodar build.

## O que tem aqui

```
index.html        página principal (intro, vitrine, lançamento, depoimentos…)
checkout.html     resumo do pedido (etapa 1 do checkout)
styles.css        estilos de todo o site
catalog.js        lista única de produtos e preços: mude preços e nomes aqui
cart.js           carrinho (fica salvo no navegador do cliente)
auth.js           ponto de ligação do login de clientes (ainda não configurado)
shop.js           busca, carrinho, favoritos, conta e detalhes do produto
script.js         animações e interações da página
checkout.js       lógica da página de checkout
glyph-portal.js   animação da intro (MIT © 2026 Christian Katzmann, aviso mantido no arquivo)
assets/           fotos dos produtos
vercel.json       configuração da Vercel (cache das imagens e cabeçalhos de segurança)
```

## Ver no computador

Abra a pasta num servidor local, por exemplo:

```bash
npx http-server -p 5173
```

Depois acesse http://localhost:5173.

## Subir no GitHub

**Pelo site do GitHub (sem terminal):**

1. Crie um repositório novo (ex.: `villa-salut-site`).
2. Clique em **"uploading an existing file"**.
3. Arraste **o conteúdo desta pasta** (os arquivos e a pasta `assets`), não a pasta inteira.
4. Clique em **Commit changes**.

**Pelo terminal (git):**

```bash
cd villa-salut-site
git init
git add .
git commit -m "primeira versão do site"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/villa-salut-site.git
git push -u origin main
```

## Publicar na Vercel

1. Entre em vercel.com com a sua conta do GitHub.
2. **Add New → Project** e importe o repositório `villa-salut-site`.
3. Em **Framework Preset**, escolha **Other**. Deixe **Build Command** e **Output Directory** vazios.
4. Clique em **Deploy**.

Depois disso, todo envio novo para a branch `main` atualiza o site sozinho.

## Antes de divulgar o site

Alguns conteúdos foram criados só para montar o layout e precisam ser trocados pelos reais:

- [ ] **Preços** dos produtos (em `catalog.js`).
- [ ] **Depoimentos** (7) e a **nota média 4,9** (em `index.html`, seção "clientes falam").
- [ ] **Políticas da loja** citadas no site: frete grátis acima de R$ 199, envio em 24h / pedidos até 14h no mesmo dia, pix e cartão em até 6x, troca em 7 dias, "100% originais".
- [ ] **Contato e razão social** no rodapé (`contato@villasalut.com.br`, "VILLA SALUT SUPLEMENTOS LTDA").
- [ ] **Links que ainda não levam a lugar nenhum:** Instagram, TikTok, YouTube, política de privacidade, trocas e devoluções, termos de uso.
- [ ] **Newsletter / cupom de 10%:** o formulário ainda **não envia o e-mail para lugar nenhum**, mas mostra a mensagem "seu cupom chega no e-mail". Ligue a um serviço de e-mail (ex.: Mailchimp, Brevo, RD Station) ou troque a mensagem antes de divulgar.

## O que depende de configuração externa

- **Login, cadastro e recuperação de senha:** precisam de um serviço de contas (ex.: Supabase Auth, Firebase Auth, Auth0). Basta trocar o objeto em `auth.js`. Hoje o site avisa o cliente que o acesso ainda não está ativo e não guarda nenhuma senha.
- **Pagamento e frete:** precisam de um backend e de um gateway (ex.: Mercado Pago, PagSeguro, Pagar.me, Stripe). O checkout mostra o resumo do pedido, mas não cobra nem cria pedido.

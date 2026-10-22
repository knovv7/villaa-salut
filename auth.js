// Villa Salut — contas de cliente.
//
// O site é estático: não tem servidor, banco de dados nem provedor de login. Login de verdade
// precisa de um serviço que guarde as senhas com segurança (nunca no navegador), por exemplo
// Supabase Auth, Firebase Authentication, Auth0 ou a API de contas da plataforma de e-commerce.
//
// Este arquivo é o único ponto de ligação: troque o objeto abaixo por um que chame o provedor
// escolhido, mantendo os mesmos métodos (todos devolvem Promise). O painel em shop.js já trata
// carregamento, erros e a tela da conta autenticada.
//
// Enquanto nada estiver configurado, toda operação recusa com uma mensagem clara.
// Nenhuma senha é guardada, enviada ou registrada.
(function () {
  const NOT_READY = 'o acesso de clientes ainda não está ativo nesta loja. em breve você poderá entrar por aqui.';
  const refuse = () => Promise.reject(new Error(NOT_READY));

  window.Auth = {
    configured: false,
    // { name, email } do cliente autenticado, ou null
    currentUser: () => null,
    signIn: (_email, _password) => refuse(),
    signUp: (_data) => refuse(),
    resetPassword: (_email) => refuse(),
    signOut: () => Promise.resolve(),
  };
})();

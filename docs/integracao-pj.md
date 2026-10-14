# Integração com o Controle PJ

O primeiro fluxo vincula a conta existente do usuário central à conta autenticada
no PJ. O consentimento mostra o e-mail das duas contas. O PJ guarda apenas o hash
do código de uso único, que expira em três minutos. O estado aleatório expira em
cinco minutos, fica salvo como hash e é conferido junto à sessão central que
iniciou o vínculo. Revogar bloqueia o acesso central imediatamente e tenta
sincronizar a revogação no PJ.

## Configuração de servidor

No backend Vercel do portfólio, configurar:

- `SUPABASE_URL` e `SUPABASE_SECRET_KEY`, apenas como variáveis server-side;
- `PORTFOLIO_BASE_URL`, domínio HTTPS do portfólio;
- `PJ_BASE_URL`, domínio HTTPS do Controle PJ;
- `PJ_INTEGRATION_SECRET`, segredo aleatório com pelo menos 32 caracteres.

No servidor do PJ, configurar `PORTFOLIO_API_URL` e o mesmo segredo em
`PORTFOLIO_INTEGRATION_SECRET`. Nunca usar prefixo `VITE_` no segredo.
O endpoint do PJ só aceita asserções HMAC HS256 com audiência, escopo, usuário e
validade curta esperados. Cada pedido de consulta verifica o vínculo local ativo
e o papel atual do usuário.

## Banco de dados

Aplicar `supabase/migrations/202610130003_pj_account_linking.sql` no Supabase do
portfólio. A migração nega acesso às tabelas pelo browser; as funções Vercel usam
a chave server-side.

No PJ, atualizar Drizzle com `bun run db:push` apenas contra banco local ou de
homologação. O SQL equivalente está no repositório do PJ em
`docs/sql/portfolio-account-links.sql`.
Não aplicar mudanças em produção antes de configurar os dois servidores e validar
o fluxo no ambiente de homologação.

## Teste manual local

Usar bancos de homologação e contas existentes nos dois apps. Com Vercel CLI
instalado, executar `vercel dev --listen 4173` no portfólio e `bun run dev -- --port
3000` no PJ. Usar `PORTFOLIO_BASE_URL=http://localhost:4173`,
`PJ_BASE_URL=http://localhost:3000` e `PORTFOLIO_API_URL=http://localhost:4173`.

Entrar no portfólio como administrador da plataforma, abrir `/admin/apps` e
selecionar “Vincular conta”. No PJ, entrar com a conta existente e conferir o
e-mail central e o e-mail PJ apresentados no consentimento. Após autorizar, o
navegador retorna ao portfólio com o vínculo ativo. “Desvincular” revoga o vínculo
dos dois lados. Abrir o callback em outra sessão ou alterar o estado deve ser
recusado.

O código e o estado de retorno seguem no fragmento da URL, não nos parâmetros de
consulta; a página central limpa o fragmento antes de chamar a API.

O acesso à lista de usuários continua limitado a uma conta PJ com papel ADMIN e é
revalidado pelo próprio PJ. A tela de consulta paginada é uma etapa seguinte; o
vínculo não muda papéis nem concede acesso administrativo.

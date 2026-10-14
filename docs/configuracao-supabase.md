# Ativação do login e painel

## Projeto provisionado neste workspace

- Projeto: `portfolio`, região São Paulo (`sa-east-1`).
- Referência: `ncskujhuswpfzcdoxrej`.
- URL: `https://ncskujhuswpfzcdoxrej.supabase.co`.
- Migração inicial aplicada e seeds executadas.
- Administrador inicial: `julianostroschon@gmail.com`.
- Configuração local em `.env`, `.env.local` e `.env.seed.local`, ignorados pelo Git.
- Senha em `SEED_ADMIN_PASSWORD` no `.env` e no arquivo `.seed-credentials.local.json`.

Login e autorização foram verificados contra o projeto real. As chaves e senhas
não são versionadas; outros checkouts precisam configurar seus próprios arquivos locais.

O frontend usa a chave pública publishable e a API de dados do Supabase.
A autorização efetiva está nas políticas RLS e grants do banco. O guard de rota
serve à navegação; não substitui a proteção do banco.
Nenhum secret/service_role é necessário para este painel no navegador.

## Projeto exclusivo da plataforma

1. Criar um projeto Supabase dedicado e configurar Auth com e-mail/senha.
2. Desativar cadastro público se somente contas provisionadas devem entrar.
3. Aplicar `supabase/migrations/202610130001_portfolio.sql` no SQL Editor do novo
   projeto ou via Supabase CLI. O script inclui os três projetos públicos existentes.
   Executar a migração uma vez; alterações posteriores usam uma nova migração.
4. Copiar `.env.seed.example` para `.env.seed.local` e preencher `SUPABASE_URL`
   e `SUPABASE_SECRET_KEY` com a chave administrativa do projeto. Esse arquivo
   é ignorado pelo Git e usado somente pelo script Node, nunca pelo frontend.
5. O e-mail inicial é `julianostroschon@gmail.com`. Para escolher a senha,
   preencher `SEED_ADMIN_PASSWORD` com pelo menos 12 caracteres. Se deixar vazio,
   o script gera uma senha aleatória. Executar:

```sh
corepack yarn seed
```

A seed adiciona somente projetos ausentes, cria o usuário com e-mail confirmado
via Supabase Auth e registra seu UUID em `platform_admins`. Credenciais de uma
conta recém-criada são salvas em `.seed-credentials.local.json`, com permissão
local `600`, sem imprimir a senha no terminal. O arquivo também é ignorado pelo Git.
`adminProvisioned: true` indica que a permissão foi aplicada.

Reexecutar não duplica projetos, não sobrescreve suas edições ou publicação e
não troca a senha de uma conta existente. Se ela já existe e não foi criada pela
seed, usar sua senha atual; o script não consegue recuperar uma senha existente.
Se a criação ocorrer e a concessão de permissão falhar, as credenciais permanecem
no arquivo com `adminProvisioned: false`; aplicar a migração e repetir a seed.
O script interrompe antes de mutações se o arquivo pertence a outro projeto/usuário.

`supabase/seed.sql` é a alternativa para semear somente projetos pelo SQL Editor,
sem criar usuários. A migração inicial mantém seus dados originais por compatibilidade.

A tabela de administradores não permite inserção/edição pela API do usuário.
Para revogar acesso, remover a linha correspondente pelo SQL Editor. As políticas
passam a negar as operações seguintes mesmo com uma sessão ainda autenticada.

6. Copiar `.env.example` para `.env.local` e preencher URL e chave publishable.
   As duas variáveis `VITE_` são públicas e entram no bundle. Nunca colocar
   senha do banco, secret ou service_role nelas.
7. Reiniciar `yarn dev`. Na Vercel, definir as mesmas variáveis públicas e refazer o deploy.
   A chave administrativa usada na seed não é necessária no frontend/deploy.
8. Abrir `/login`, entrar com as credenciais criadas e acessar `/admin`.

Configurar Site URL para o domínio da plataforma. Esta entrega usa login por
senha; recuperação de senha e provedores sociais não estão implementados.

## Comportamento

Sem configuração, o portfólio mantém os três projetos locais e o formulário
informa que o login ainda não está disponível. Com configuração, o banco passa
a ser a fonte dos projetos: somente publicados aparecem publicamente.
Falhas de consulta não são substituídas pelos projetos locais, para não revelar
um projeto despublicado. Nenhum projeto disponível resulta em estado vazio.

Administradores podem criar, editar e publicar/despublicar projetos. Usuários
comuns não editam nem acessam rascunhos ou auditoria. A lista do painel usa cards,
não tabela. As alterações são auditadas automaticamente no banco, em transação
com a gravação. A auditoria pode ser consultada em `project_audit` pelo SQL Editor.
A remoção de projetos exige confirmação e permanece restrita a administradores. O registro de auditoria preserva os dados anteriores após a remoção. O gerenciamento de administradores não faz parte desta entrega.

## Verificação após ativação

- Visitante: vê apenas projetos publicados; `/admin` retorna ao login.
- Usuário comum: recebe acesso negado e pode sair para trocar de conta.
- Administrador: cria rascunho, edita e publica; nova visita pública mostra o conteúdo.
- Despublicação: projeto deixa de aparecer em uma nova consulta pública.
- Revogação: remover o UUID de `platform_admins` impede a próxima gravação.
- API direta: usuário comum não insere/edita projetos nem adiciona administradores.
- Auditoria: cada insert/update gera uma linha com ator e antes/depois.

`yarn test` verifica a validação dos dados e o provisionamento da seed com cliente simulado. `yarn test:rls` usa Docker
e a imagem `postgres:16-alpine` para executar a migração e testar as políticas
em um banco descartável, sem portas expostas. O container é removido ao terminar.
O teste simula `auth.uid()` e os papéis Supabase; não testa o serviço Supabase Auth.
Após aplicar a migração, repetir a verificação no projeto real: testes locais
não comprovam a aplicação das políticas no banco de produção.

Referências: [API keys](https://supabase.com/docs/guides/getting-started/api-keys),
[RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

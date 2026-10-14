# Portfólio e central administrativa

## Objetivo e escopo acordado

Criar uma apresentação pública do trabalho e dos projetos, com links para produção,
e uma área autenticada para editar o portfólio e administrar usuários dos apps.
Vincular a conta da plataforma a usuários existentes em cada aplicação.
Abrir os apps já autenticados não faz parte desta primeira entrega.

| Aplicação | Repositório | Produção |
| --- | --- | --- |
| Pulso | https://github.com/julianostroschon/indicadores | https://pulso.julianostroschon.dev/ |
| PJ | https://github.com/julianostroschon/controle-pj | https://pj.julianostroschon.dev/ |
| Fortuna | https://github.com/julianostroschon/fortuna-app | https://fortuna.julianostroschon.dev/ |

Não existe issue para este trabalho. Este documento registra a proposta de backlog;
nenhuma issue foi criada nem houve alteração nos repositórios dos apps.

## Arquitetura encontrada

Inspeção dos arquivos da branch padrão dos repositórios em 13/10/2026.
O código consultado não comprova qual revisão está publicada em produção.

| Projeto | Stack | Identidade e autorização |
| --- | --- | --- |
| Plataforma atual | Vue 3, Vite, Quasar e JavaScript; App.vue declara TypeScript | Template inicial, sem login ou backend implementado |
| Pulso | Next.js, TypeScript, Prisma e PostgreSQL | Auth.js v5, sessões JWT, senha local e Google; isolamento por ownerId |
| PJ | Next.js, TypeScript, Drizzle e PostgreSQL | NextAuth v4, sessões JWT, senha local e GitHub opcional; ADMIN/MEMBER e ADMIN_EMAILS |
| Fortuna | Next.js, TypeScript, Drizzle e PostgreSQL | NextAuth v4, sessões JWT, senha local e provedores OAuth opcionais; administração por ADMIN_EMAILS |

Fontes principais:

- Pulso: `src/auth.ts`, `src/lib/authz.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma`.
- PJ: `src/lib/auth.ts`, `src/app/actions.ts`, `src/db/schema.ts`, `src/db/index.ts`, `src/support/env.ts`, `src/app/admin/users/page.tsx`.
- Fortuna: `src/lib/auth.ts`, `src/app/actions.ts`, `src/db/schema.ts`, `src/db/index.ts`, `src/support/env.ts`, `src/app/admin/usuarios/page.tsx`.

Nos arquivos examinados, os usuários pertencem às tabelas próprias dos apps,
não ao Supabase Auth. O PostgreSQL pode estar hospedado no Supabase, mas a associação
entre projetos, bancos e ambientes ainda precisa ser confirmada.
A API de administração do Supabase Auth não substituirá a gestão dessas tabelas.

Pulso atribui ADMIN por padrão à própria conta. Esse papel não autoriza listar ou
alterar outros usuários. PJ já possui consulta administrativa de usuários.
Fortuna já possui telas de consulta, criação e edição, incluindo planos.
As server actions existentes não devem ser tratadas como uma API pública de integração.

## Proposta de arquitetura

Decisão incremental da etapa 2: login central com Supabase Auth e CRUD de projetos
pela API Supabase protegida por RLS, sem uma API Vercel intermediária nesta entrega.
O servidor de integrações permanece previsto para chamadas privilegiadas aos apps.

Preservar Vue/Vite para o frontend. Adicionar backend TypeScript com funções na
Vercel e banco central PostgreSQL, preferencialmente em um projeto Supabase próprio.
Validar o runtime e a configuração de publicação antes de definir dependências.
Usar Supabase Auth para a identidade central é uma proposta; não exige migrar
a autenticação dos três apps.

O frontend acessa apenas a API central. A API central valida a sessão, a permissão
da plataforma e o vínculo; comunica-se com endpoints de integração dos apps.
Cada app valida a identidade de serviço, o usuário vinculado e a permissão atual,
e usa seu ORM para acessar o próprio banco.

Essa abordagem exige pequenas alterações nos apps, mas preserva suas regras e
evita reproduzir três modelos de autorização na plataforma. Acesso direto aos
bancos externos, caso necessário depois, terá credenciais limitadas e operações
específicas; não será usado para contornar autorização nem como editor SQL genérico.

## Identidade, vínculo e permissões

Separar três conceitos:

- Permissão central: quem pode editar o portfólio, configurar integrações e operar a central.
- Vínculo: relação comprovada entre usuário central e usuário existente em um app.
- Capacidade externa: o que esse usuário pode executar naquele app neste momento.

Um vínculo não promove o usuário externo a administrador. Capacidades devem ser
validadas no app em cada operação; snapshots servem apenas para exibição.
Falha na consulta de autorização deve negar a operação, sem reutilizar permissão antiga.

Fluxo proposto de vinculação:

1. Usuário autenticado na central solicita vincular uma aplicação cadastrada.
2. Backend cria uma tentativa curta, com state imprevisível e vínculo à sessão central.
3. A aplicação solicita seu login normal, se necessário, e consentimento explícito.
4. A aplicação emite código opaco, curto, de uso único, associado ao usuário autenticado,
   à tentativa e à central; apenas o hash do código é persistido.
5. A central recebe o callback, valida state e troca o código via servidor.
6. O app consome o código atomicamente e informa seu identificador de usuário.
7. A central registra o vínculo e consulta as capacidades disponíveis.

Aceitar apenas callbacks e destinos cadastrados. Não compartilhar cookies entre
subdomínios nem transportar senhas, sessões ou credenciais de serviço pela URL.
Proteger iniciação, consentimento e desvinculação contra CSRF e limitar tentativas.
Desvincular revoga o vínculo e qualquer autorização específica dele no app.
A abertura normal dos links de produção permanece independente desse fluxo.

Proposta inicial: uma conta externa por aplicação por usuário central e uma conta
externa vinculada a apenas um usuário central. Qualquer necessidade de múltiplas
contas deve revisar essa regra antes da migração.

## Modelo central proposto

| Entidade | Conteúdo |
| --- | --- |
| Profile | Identidade central e permissão da plataforma, sem edição pelo próprio usuário |
| Project | Nome, slug, descrição, tecnologias, imagem, URL pública, destaque e publicação |
| AppIntegration | App, origem permitida, referência ao projeto Vercel e referência de credencial |
| AccountLink | Usuário central, app, identificador externo, status e datas de vínculo/revogação |
| LinkAttempt | Tentativa, hash do state, expiração e estado de consumo |
| AuditEvent | Ator central/externo, app, ação, alvo, resultado, data e correlação |
| TablePreference | Usuário/contexto, tabela, ordem, visibilidade e tamanho de página |

O app mantém a prova de vínculo/revogação correspondente para não confiar apenas
em um externalUserId enviado pela central. Segredos ficam na configuração do servidor,
com credenciais diferentes por app e ambiente, fora do conteúdo público e dos logs.
Auditoria não contém senhas, hashes de senha, cookies ou códigos de vinculação.

## Backlog incremental

### 1. Fundação e portfólio público

- Definir conteúdo pessoal, identidade visual e domínio da plataforma.
- Criar apresentação, projetos e contato; cadastrar os três links conhecidos.
- Adicionar navegação e páginas de projeto, com acessibilidade e layout responsivo.
- Arquivos prováveis: `src/App.vue`, `src/main.js`, `src/style.css`, `src/components/`,
  novas pastas `src/pages/` e `src/router/`, `package.json` e `README.md`.
- Aceite: links corretos, leitura pública sem login, navegação em celular e desktop.

### 2. Login central e edição do portfólio

- Preparar backend, banco central, autenticação e provisionamento do administrador inicial.
- Negar acesso administrativo por padrão; proteger API e banco além da navegação.
- Implementar edição/publicação de projetos e trilha de alterações.
- Arquivos prováveis: `api/`, `src/services/`, `src/pages/admin/`, migrações centrais,
  `.env.example` com placeholders e configuração Vercel.
- Aceite: visitantes veem apenas projetos publicados; usuário comum não edita;
  administrador consegue publicar e despublicar; segredos não entram no bundle.

### 3. Piloto de integração: PJ

- Começar por PJ: já possui papel global e consulta de usuários, permitindo piloto de leitura.
- Extrair a consulta necessária para um serviço reutilizável, preservando a server action atual.
- Criar o fluxo de vínculo e uma API versionada que liste somente campos permitidos,
  com paginação e autorização pelo usuário vinculado.
- Identidade de serviço com credencial por app, guardada apenas nos servidores;
  limitar escopos, permitir rotação e associar cada pedido ao vínculo verificado.
- Implementar desvinculação e indisponibilidade sem apresentar sucesso fictício.
- Arquivos prováveis no PJ: novas rotas em `src/app/api/integrations/portfolio/`,
  página de consentimento, serviço em `src/lib/`, `src/db/schema.ts`, migração,
  configuração de ambiente e testes. `src/app/actions.ts` somente para reutilização necessária.
- Aceite: MEMBER vincula sua conta, mas não lista usuários; ADMIN autorizado lista;
  vínculo revogado, usuário removido ou papel rebaixado perde acesso imediatamente.

### 4. Fortuna e Pulso

- Fortuna: reutilizar a autorização por ADMIN_EMAILS e serviços administrativos;
  iniciar por consulta e acrescentar criação/edição de perfil e plano conforme escopo.
  Mudanças de plano preservam validade e regras comerciais existentes.
- Pulso: implementar vínculo e consulta da própria identidade primeiro. Definir e
  implementar uma permissão de operador global separada antes de listar outros usuários.
- Cada app mantém sua autorização, seus IDs e seus modelos de isolamento.
- Arquivos prováveis: rotas e serviços de integração, migrações de vínculos,
  configuração e testes de cada app; Pulso exige regra específica em torno de `src/lib/authz.ts`.
- Aceite: ADMIN de conta no Pulso não obtém administração global; usuário comum no
  Fortuna não ganha acesso administrativo por possuir plano premium.

### 5. Gestão de usuários e dados autorizados

- Definir por app quais campos podem ser editados e quais ações de suporte são necessárias.
- Acrescentar escrita apenas onde houver operação equivalente e autorização explícita.
- Não incluir exclusão de usuários, alteração de senha ou edição de dados financeiros
  no MVP; definir seus efeitos e critérios antes de acrescentá-las.
- Usar DTOs com lista explícita de campos: nunca retornar registros completos com senha.
- Implementar tabela reutilizável conforme a convenção global: ordenação, filtros
  tipados no hover do cabeçalho, cápsulas removíveis, tamanho de página, contagens,
  primeira/anterior/até três páginas/próxima/última e preferências de colunas por usuário,
  com visibilidade e ordem por drag-and-drop e links para detalhes.
- Aceite: alterações validadas no app, com auditoria e erros claros; filtros e
  contagens consideram a base completa, não apenas a página carregada.

### 6. Integração Vercel

- Confirmar equipe/conta e IDs dos projetos; associá-los explicitamente aos três apps.
- Consultar projeto, domínio e último deployment por uma credencial de servidor.
- Exibir dados reais com data de atualização e estados de erro/indisponibilidade.
- MVP de leitura; deploys, exclusões e alterações de infraestrutura ficam para outra etapa.
- Aceite: central consulta apenas projetos cadastrados; token nunca é exposto ao browser.

## Verificação e revisão

Testar comportamento de autenticação, autorização e vínculo: state inválido,
código expirado/reutilizado, troca de app/usuário, sessão central diferente,
revogação, rebaixamento de papel, falha de backend e proteção contra CSRF.
Testar DTOs para ausência de campos sensíveis, paginação e auditoria das escritas.
Reutilizar Vitest dos apps. Definir testes do backend central quando sua estrutura existir.
Executar build e verificações apropriadas a cada PR; revisar o diff antes de concluir.
Validar primeiro em ambientes de teste, com bancos e credenciais separados de produção.

## Pendências de configuração e produto

- IDs e associação dos projetos Supabase/PostgreSQL e Vercel, sem colocar segredos neste documento.
- Confirmar revisões publicadas, migrações e existência de ambientes de teste.
- Domínio, conteúdo pessoal e identidade visual da plataforma.
- Quem recebe a permissão central inicial e quais ações de suporte entram por app.
- Definição do operador global do Pulso, separado do administrador da própria conta.
- Definir retenção da auditoria, expiração das tentativas e limites de requisição.

Essas pendências não impedem a primeira entrega pública. Credenciais e confirmação
das regras de autorização são necessárias antes de ativar integrações reais.

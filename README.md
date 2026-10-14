# Portfólio — Juliano Stroschon

Portfólio público em Vue 3 + Vite, com apresentação e links para Pulso, PJ e Fortuna.
O plano da futura central administrativa está em [docs/plano-plataforma.md](docs/plano-plataforma.md).

## Desenvolvimento

```sh
corepack yarn install --frozen-lockfile
corepack yarn dev
```

## Build de produção

```sh
corepack yarn build
corepack yarn preview
```

A saída está em `dist/`. Na Vercel, utilizar o preset Vite, o comando de build
`yarn build` e o diretório de saída `dist`.

## Conteúdo

- Apresentação: `src/pages/HomePage.vue`; projetos locais: `src/data/projects.js`.
- Card reutilizável: `src/components/ProjectCard.vue`.
- Estilos e breakpoints: `src/style.css`.
- Título, descrição e idioma: `index.html`.

As representações dos projetos são composições gráficas, não screenshots dos apps.
O contato inclui e-mail e LinkedIn; o GitHub permanece na seção de apresentação.
As fontes são carregadas pelo Google Fonts, com fallback local sans-serif.

O botão de tema no cabeçalho alterna entre claro e escuro. A preferência inicial
acompanha o sistema; após uma escolha manual, ela é salva neste navegador.
Quando o armazenamento do navegador está indisponível, a alternância continua
funcionando durante a visita. O tema é aplicado antes da renderização inicial.

O login está em `/login` e o painel de projetos em `/admin`. Para ativá-los,
seguir [a configuração Supabase](docs/configuracao-supabase.md), aplicar a migração
e provisionar o administrador inicial. Sem variáveis de ambiente, a página pública
funciona com os projetos locais e o login fica indisponível.

Executar `corepack yarn test` para os testes de validação. O fluxo de vínculo com
o Controle PJ já está implementado, mas depende da migração e das variáveis de
servidor descritas em [docs/integracao-pj.md](docs/integracao-pj.md). Pulso,
Fortuna e a gestão de deployments Vercel ficam para etapas seguintes.

O piloto de vínculo de contas com o Controle PJ está descrito em
[docs/integracao-pj.md](docs/integracao-pj.md). Ele exige funções Vercel e
configuração server-side antes de ficar disponível.

## Seeds e credenciais iniciais

Após aplicar a migração, copiar `.env.seed.example` para `.env.seed.local`,
configurar a URL e chave administrativa Supabase e executar `corepack yarn seed`.
A seed adiciona projetos ausentes e provisiona `julianostroschon@gmail.com` como
administrador. A senha pode ser definida em `SEED_ADMIN_PASSWORD` ou gerada
automaticamente; credenciais criadas ficam em `.seed-credentials.local.json`
(ignorado pelo Git). Contas existentes mantêm suas senhas.

A seed SQL de projetos está em `supabase/seed.sql`. Reexecutar as seeds preserva
projetos existentes e suas alterações. Detalhes em [configuração Supabase](docs/configuracao-supabase.md).

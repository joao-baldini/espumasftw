# Espumas — Campeonato Valorant

Site para organizar as composições do time em Abyss, Ascent, Haven, Summit, Split, Sunset e Lotus. Cada mapa guarda os agentes de joao, ronaldo, bolla, rafa e felipe, procedimentos por fase, observações e resultados de treinos. Default, Exec por bomb, Pós Plant e Retake aparecem junto ao quadro tático da fase. O quadro salva automaticamente agentes, habilidades, desenhos e textos por mapa e fase.

Os minimapas, as posições e os ícones de habilidades do quadro tático são baixados com `node scripts/fetch-tactics-assets.mjs`. Os alcances ficam em `lib/tactics/abilities.ts` e são aproximados.

## Desenvolvimento

Requer Node.js 22.13 ou mais recente.

```sh
npm ci
npm run dev
```

O frontend e as rotas públicas rodam em Next.js na Vercel. A API privada roda no Render, com dados no Postgres do Neon, no schema `espumas`. As rotas Next.js encaminham as chamadas com `ESPUMAS_API_KEY`; o navegador não recebe a chave nem a URL do banco. A origem da API é definida por `ESPUMAS_DATA_ORIGIN`.

Para a API, rode `cd server && npm ci && npm start`. Configure `DATABASE_URL` (conexão pooled do Neon) e `ESPUMAS_API_KEY`. Antes da primeira execução, rode `npm run migrate` com `DATABASE_URL_UNPOOLED` (conexão direta). `server/scripts/import-sites.mjs` importa os dados do serviço anterior durante a migração. Não execute a importação depois que o time começar a editar os dados no Neon, pois ela sobrescreve os registros.

As Observações Gerais do Time usam um registro próprio no banco, acessado pela rota `/api/team-observations`. O texto é o mesmo em todos os mapas e tem limite de 5.000 caracteres.

As imagens dos mapas e ícones dos agentes vêm do [Valorant-API](https://valorant-api.com/), a partir de conteúdo do VALORANT. Este é um projeto independente, sem afiliação com a Riot Games ou com a FIAP.

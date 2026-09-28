# Espumas — Campeonato Valorant

Site para organizar as composições do time em Abyss, Ascent, Haven, Summit, Split, Sunset e Lotus. Cada mapa guarda os agentes de joao, ronaldo, bolla, rafa e felipe e um campo de observações compartilhado.

## Desenvolvimento

Requer Node.js 22.13 ou mais recente.

```sh
npm ci
npm run db:generate
npm run dev
```

O banco é Cloudflare D1. As migrações em `drizzle/` devem ser aplicadas ao ambiente local ou de publicação antes do uso da API. O deploy do Sites aplica as migrações do projeto.

As imagens dos mapas e ícones dos agentes vêm do [Valorant-API](https://valorant-api.com/), a partir de conteúdo do VALORANT. Este é um projeto independente, sem afiliação com a Riot Games ou com a FIAP.

# Espumas — Campeonato Valorant

Site para organizar as composições do time em Abyss, Ascent, Haven, Summit, Split, Sunset e Lotus. Cada mapa guarda os agentes de joao, ronaldo, bolla, rafa e felipe e um campo de observações compartilhado.

## Desenvolvimento

Requer Node.js 22.13 ou mais recente.

```sh
npm ci
npm run dev
```

O frontend e as rotas da API rodam em Next.js na Vercel. As rotas consultam a API do site original, que mantém o banco compartilhado Cloudflare D1 e preserva as composições já salvas. É possível alterar a origem dessa API com a variável de servidor `ESPUMAS_DATA_ORIGIN`.

As imagens dos mapas e ícones dos agentes vêm do [Valorant-API](https://valorant-api.com/), a partir de conteúdo do VALORANT. Este é um projeto independente, sem afiliação com a Riot Games ou com a FIAP.

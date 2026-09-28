# Espumas — Campeonato Valorant

Site para organizar as composições do time em Abyss, Ascent, Haven, Summit, Split, Sunset e Lotus. Cada mapa guarda os agentes de joao, ronaldo, bolla, rafa e felipe, procedimentos por fase, observações do mapa e o total de vitórias e derrotas em treinos. O time também tem um campo de observações gerais, independente do mapa selecionado.

## Desenvolvimento

Requer Node.js 22.13 ou mais recente.

```sh
npm ci
npm run dev
```

O frontend e as rotas da API rodam em Next.js na Vercel. As rotas consultam a API do site original, que mantém o banco compartilhado Cloudflare D1 e preserva as composições já salvas. É possível alterar a origem dessa API com a variável de servidor `ESPUMAS_DATA_ORIGIN`.

Como a API compartilhada ainda aceita apenas os campos das fases, esta aplicação codifica as observações de cada mapa junto com seu procedimento de Default ao salvar e separa os dois textos ao carregar. Esses dois campos compartilham o limite de 5.000 caracteres da API original.

As Observações Gerais do Time usam um registro próprio no banco compartilhado, acessado pela rota `/api/team-observations`. O texto é o mesmo em todos os mapas e tem limite de 5.000 caracteres.

As imagens dos mapas e ícones dos agentes vêm do [Valorant-API](https://valorant-api.com/), a partir de conteúdo do VALORANT. Este é um projeto independente, sem afiliação com a Riot Games ou com a FIAP.

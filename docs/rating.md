# Rating Espumas v1

## Objetivo e dados

Estimar o VLR Rating 2.0 a partir das estatísticas disponíveis no placar de um mapa normal de VALORANT. Não usar em Deathmatch, Skirmish ou misturando formatos. Não medir rank ou habilidade absoluta: é uma avaliação daquela atuação.

O [VLR descreve o cálculo original](https://www.vlr.gg/160667/vlr-gg-player-rating-explained) e as [mudanças do Rating 2.0](https://www.vlr.gg/381456/vlr-rating-2-0-update). O algoritmo oficial usa contribuição de kills/deaths conforme vantagem numérica, economia, trocas e kills depois do round; assistências e dano ajustado também entram. A versão 2.0 reduziu o efeito das trocas e assistências e removeu a contribuição de sobrevivência. Os coeficientes completos não são publicados nesses artigos.

Dados factuais de calibração: `data/rating-analysis/vlr-samples.json`. Cada observação tem URL da série, IDs de mapa/jogador, rounds, estatísticas e rating oficial exibido no VLR. Somente mapas concluídos, com dez jogadores e campos completos. Dados coletados em 08/10/2026; a série que estava ao vivo e séries futuras foram excluídas. O coletor opcional `python scripts/collect-vlr-rating.py` usa `requests` e `beautifulsoup4`, com cache em `work/` (não versionado). Atualizar o dataset altera o universo de validação; o relatório atual é um snapshot fixo.

## Fórmula

Com `N` rounds, defina `KPR = K/N`, `DPR = D/N`, `APR = A/N` e `FDPR = FD/N`. ACS e ADR são as médias por round do placar.

Forma expandida dos coeficientes versionados:

```text
R bruto = 0.7859968
        + 0.582692617 × KPR
        − 0.9109516   × DPR
        + 0.1943517125 × APR
        + 0.0013429978 × ADR
        + 0.0012157091 × ACS
        − 0.28254182   × FDPR

R exibido = arredondar(max(0, R bruto), 2 casas)
```

O código usa uma forma equivalente com `damageResidual = (ADR − 120×KPR)/100` e `combatResidual = (ACS − ADR − 150×KPR − 25×APR)/100`. São mudanças lineares de base para facilitar a interpretação e o ajuste conjunto; **120 não é uma constante revelada pelo VLR**, e esses resíduos não recuperam o dano ou impacto de cada evento. ACS oferece informação agregada da ordem das kills e multikills. Os pesos conjuntos reduzem a redundância entre os campos; somar bônus arbitrários a ACS, ADR e kills voltaria a contá-los em excesso.

Todos os pesos são obtidos por regressão com regularização e restrições de sinal. Kills, dano e assistências não devem piorar o rating; mortes e primeiras mortes não devem melhorá-lo. FK foi testado como variável separada, mas recebeu peso zero no modelo selecionado: não somamos um bônus sem evidência além do que ACS já representa. KAST foi testado e descartado pela seleção em 2025. HS%, agente, vitória e rank não entram. Não há bônus direto por sobreviver nem normalização que force cada lobby a ter média 1.

Na série, ponderamos o **rating bruto** de cada mapa pelos seus rounds e só então aplicamos o piso zero e arredondamento. Isso evita tirar a média de números já arredondados ou dar o mesmo peso a mapas de 19 e 28 rounds. ADR preciso é usado no cálculo; os números gerais exibidos podem manter as médias arredondadas do relatório original.

## Calibração e validação

- Treino: 34 séries, 88 mapas, 880 observações do Champions 2025.
- Seleção: cinco grupos definidos por hash do ID da série. Todos os mapas e jogadores de uma série ficam no mesmo grupo. Escolha de variáveis e regularização exclusivamente nesses grupos de 2025.
- Candidatos: kills/deaths/assists e dano residual; aberturas; KAST; resíduo de ACS; combinações. Regularização 0, 1 ou 10, com variáveis padronizadas usando apenas o subconjunto de treino de cada grupo.
- Modelo selecionado: aberturas + resíduo de ACS, regularização 1. MAE de validação cruzada: 0,0568.
- Teste de outro evento, fora do ajuste: 23 séries concluídas, 53 mapas, 530 observações do Champions 2026.

| Medida no teste | Resultado |
| --- | ---: |
| Erro absoluto médio (MAE) | 0,05833 ponto |
| Raiz do erro quadrático médio | 0,07196 ponto |
| Percentil 90 do erro absoluto | 0,11607 ponto |
| Estimativas a até 0,10 do oficial | 85,47% |
| R² | 0,94994 |
| Viés médio (estimado − oficial) | +0,00212 |

As métricas usam previsões sem arredondamento; não são uma porcentagem de "fidelidade" nem garantia por jogador. Resultados e previsões de teste: `data/rating-analysis/validation-report.json`. Coeficientes do runtime: `lib/vlr/rating-model.json`. Não reajustamos os pesos usando o evento de teste. O experimento inicial sem restrições foi descartado por produzir penalidades em variáveis úteis; a escolha final segue os sinais esperados e os resultados de validação cruzada em 2025.

## Conferência dos Espumas

Os dez jogadores dos três mapas foram conferidos nas páginas de [Ascent](https://tracker.gg/valorant/match/42589ce4-7648-4b0e-a01f-d89b96e52efe), [Split](https://tracker.gg/valorant/match/800ae5eb-16d7-4304-b587-3acb52a3b802) e [Summit](https://tracker.gg/valorant/match/df1748ca-b6a4-4de1-b0bd-2814acca1b20). A transcrição de campos visíveis está em `data/rating-analysis/tracker-scoreboards.json`; `node scripts/sync-tracker-scoreboards.mjs` valida os totais contra o registro do time e importa ADR com uma casa decimal. Ratings antigos digitados no relatório foram removidos dos dados usados pela página.

## Limitações e evolução

Com totais de placar, duas atuações com os mesmos números recebem a mesma estimativa, mesmo que uma tenha kills decisivas e a outra kills em eco ou depois do round. O Tracker mostra eventos e economia por round, mas atribuir pesos próprios a esses eventos sem calibração equivalente não comprova maior proximidade ao VLR. Esta versão não inventa trocas, clutches ou modificadores econômicos ausentes dos seus inputs.

A validação cobre profissionais de dois eventos internacionais, com agentes/mapas e jogadores parcialmente repetidos. A separação é por evento e série, não por identidade do jogador. Não temos rating VLR oficial das partidas personalizadas para medir o erro nelas. Jogos muito fora da distribuição profissional podem ter erro maior.

Para evoluir, coletar eventos e economia em ambas as bases (referências VLR e partidas do time), ajustar o modelo usando esses dados e comparar em um **novo conjunto de teste**. Os dados de 2026 já inspecionados não devem virar um alvo de ajuste e continuar sendo apresentados como teste independente de versões futuras.

## Comandos

```sh
npm run rating:calibrate
npm run rating:check
npm run vlr:validate
```

O ajuste e a validação não precisam de rede; os dados estão versionados. Testes conferem monotonicidade, entradas inválidas, zero mortes, invariância por rounds, média da série sem arredondamento, ausência de override manual e as 530 previsões de teste no mesmo runtime usado pelo site.

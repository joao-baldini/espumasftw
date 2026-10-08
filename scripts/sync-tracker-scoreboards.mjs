import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

// Offline transcription from visible Tracker scoreboards; no hidden API access.
const source = JSON.parse(await readFile(new URL("../data/rating-analysis/tracker-scoreboards.json", import.meta.url), "utf8"));
const path = new URL("../data/vlr/espumas-esponjas-2026-10-07.json", import.meta.url);
const match = JSON.parse(await readFile(path, "utf8"));
assert.equal(source.maps.length, match.maps.length);
for (const map of match.maps) {
  const scoreboard = source.maps.find((entry) => entry.map === map.id);
  assert(scoreboard && scoreboard.rows.length === 10, `${map.id}: incomplete Tracker transcription`);
  for (const row of map.stats) {
    const player = match.players.find((entry) => entry.id === row.playerId);
    const records = scoreboard.rows.filter((entry) => entry.name.toLowerCase().split(" #")[0].includes(player.name.toLowerCase()));
    assert.equal(records.length, 1, `Ambiguous player ${row.playerId}`);
    const record = records[0];
    assert.equal(record.values.length, 13);
    assert.equal(record.agent, row.agent);
    const number = (index) => Number(record.values[index].replace("%", ""));
    for (const [key, index] of [["acs", 0], ["kills", 1], ["deaths", 2], ["assists", 3], ["hs", 8], ["kast", 9], ["fk", 10], ["fd", 11]]) {
      assert.equal(row[key], number(index), `${map.id} ${row.playerId}: inconsistent ${key}`);
    }
    assert(Math.abs(row.adr - number(7)) <= .5, `${map.id} ${row.playerId}: unexpected damage discrepancy`);
    row.adr = number(7);
    delete row.rating;
    player.riotId = decodeURIComponent(record.profile.split("/riot/")[1]);
  }
}
for (const stats of Object.values(match.seriesStats)) delete stats.rating;
match.ratingNote = "Rating Espumas v1: estimativa calibrada com ratings VLR 2.0 de partidas profissionais. Usa eliminações, mortes, assistências e primeiras mortes por round, ADR e ACS. O rating geral pondera os mapas pelos rounds, sem arredondamento intermediário. Trocas, economia e contexto das eliminações não são reconstruídos a partir dos totais.";
await writeFile(path, JSON.stringify(match, null, 2) + "\n");
console.log("30 registros conferidos no Tracker; ADR preciso importado; ratings manuais removidos.");

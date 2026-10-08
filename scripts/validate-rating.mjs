import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { rawRating, estimateRating, RATING_VERSION } from "../lib/vlr/rating.mjs";
import { leaderboardRows } from "../lib/vlr/stats.ts";

const load = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const match = await load("../data/vlr/espumas-esponjas-2026-10-07.json");
const dataset = await load("../data/rating-analysis/vlr-samples.json");
const report = await load("../data/rating-analysis/validation-report.json");
assert.equal(report.version, RATING_VERSION);
const unique = new Set();
for (const row of dataset.observations) {
  const key = `${row.matchId}/${row.mapId}/${row.playerId}`;
  assert(!unique.has(key), `Duplicate calibration observation ${key}`);
  unique.add(key);
}
const base = { rounds: 20, kills: 15, deaths: 14, assists: 6, adr: 140, acs: 215, fk: 3, fd: 2, kast: 75 };
// Independently expanded coefficients check the residual transformations.
const reference = .7859968 + .582692617 * .75 - .9109516 * .7 + .1943517125 * .3 + .0013429978 * 140 + .0012157091 * 215 - .28254182 * .1;
assert(Math.abs(rawRating(base) - reference) < 1e-9);
for (const key of ["kills", "assists", "adr", "acs"]) assert(rawRating({ ...base, [key]: base[key] + 1 }) > rawRating(base), `${key} must not lower the score`);
for (const key of ["deaths", "fd"]) assert(rawRating({ ...base, [key]: base[key] + 1 }) < rawRating(base), `${key} must not improve the score`);
assert(rawRating({ ...base, fk: 4 }) >= rawRating(base));
assert.equal(rawRating({ ...base, kast: 100 }), rawRating(base), "No survival / KAST bonus");
assert.equal(rawRating({ ...base, rounds: 40, kills: 30, deaths: 28, assists: 12, fk: 6, fd: 4 }), rawRating(base), "Equivalent per-round performance must have the same rating");
assert(Number.isFinite(estimateRating({ ...base, deaths: 0, fd: 0 })), "Zero deaths must not divide by zero");
assert.equal(estimateRating({ ...base, kills: 0, deaths: 20, assists: 0, adr: 0, acs: 0, fk: 0, fd: 0 }), 0);
for (const invalid of [{ rounds: 0 }, { rounds: 1.5 }, { kills: NaN }, { adr: -1 }, { fk: 16 }, { fd: 15 }, { kast: 101 }]) assert.throws(() => rawRating({ ...base, ...invalid }), RangeError);
// Check actual runtime against all independently stored held-out predictions.
const test = dataset.observations.filter((row) => row.split === "test");
assert.equal(test.length, report.predictions.length);
for (let i = 0; i < test.length; i++) {
  assert.equal(test[i].playerId, report.predictions[i].playerId);
  assert(Math.abs(rawRating(test[i]) - report.predictions[i].predicted) < 1e-8);
}
assert(report.holdout.mae < .075, "Calibration accuracy regression");
// Series round weighting must use unrounded map scores and precise ADR.
for (const player of match.players) {
  const entries = match.maps.map((map) => ({ ...map.stats.find((row) => row.playerId === player.id), rounds: map.score[0] + map.score[1] }));
  const rounds = entries.reduce((sum, row) => sum + row.rounds, 0);
  const expected = Math.round(Math.max(0, entries.reduce((sum, row) => sum + rawRating(row) * row.rounds, 0) / rounds) * 100) / 100;
  assert.equal(leaderboardRows(match).find((row) => row.id === player.id).rating, expected);
}
// Hard-coded old estimates cannot override the computed score.
const manual = structuredClone(match);
for (const map of manual.maps) for (const row of map.stats) row.rating = 9;
manual.seriesStats.intertwined.rating = 9;
assert.equal(leaderboardRows(manual).find((row) => row.id === "intertwined").rating, 1.38);
console.log(`Rating: per-round invariants, aggregation and ${test.length} held-out predictions verified; MAE ${report.holdout.mae}.`);

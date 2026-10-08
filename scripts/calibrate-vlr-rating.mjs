import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { ratingFeatures } from "../lib/vlr/rating-features.mjs";

const dataset = JSON.parse(await readFile(new URL("../data/rating-analysis/vlr-samples.json", import.meta.url), "utf8"));
const train = dataset.observations.filter((row) => row.split === "train");
const test = dataset.observations.filter((row) => row.split === "test");
const keys = ["kpr", "dpr", "apr", "damageResidual"];
const candidates = [
  { name: "core", features: keys },
  { name: "openings", features: [...keys, "fkpr", "fdpr"] },
  { name: "openings-kast", features: [...keys, "fkpr", "fdpr", "kast"] },
  { name: "openings-combat", features: [...keys, "fkpr", "fdpr", "combatResidual"] },
  { name: "openings-kast-combat", features: [...keys, "fkpr", "fdpr", "kast", "combatResidual"] },
];
const fold = (row) => createHash("sha256").update(row.matchId).digest().readUInt32BE(0) % 5;
const features = (row, names) => { const all = ratingFeatures(row); return names.map((key) => all[key]); };
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const round = (value) => Math.round(value * 1e8) / 1e8;

function fit(rows, names, ridge) {
  const raw = rows.map((row) => features(row, names));
  const means = names.map((_, i) => mean(raw.map((row) => row[i])));
  const scales = means.map((m, i) => Math.sqrt(mean(raw.map((row) => (row[i] - m) ** 2))) || 1);
  const x = raw.map((row) => [1, ...row.map((v, i) => (v - means[i]) / scales[i])]);
  const size = names.length + 1;
  const xtx = Array.from({ length: size }, (_, i) => Array.from({ length: size }, (_, j) => x.reduce((sum, row) => sum + row[i] * row[j], 0) + (i === j && i !== 0 ? ridge : 0)));
  const xty = Array.from({ length: size }, (_, i) => x.reduce((sum, row, j) => sum + row[i] * rows[j].rating, 0));
  // Bounded coordinate descent: useful stats cannot become penalties;
  // deaths / opening deaths cannot become rewards. These constraints are
  // chosen from the meaning of the stats, not from the 2026 holdout scores.
  const weights = Array(size).fill(0);
  let converged = false;
  for (let iteration = 0; iteration < 20000; iteration++) {
    let change = 0;
    for (let j = 0; j < size; j++) {
      const proposed = (xty[j] - weights.reduce((sum, weight, k) => sum + (k === j ? 0 : xtx[j][k] * weight), 0)) / xtx[j][j];
      const value = j === 0 ? proposed : ["dpr", "fdpr"].includes(names[j - 1]) ? Math.min(0, proposed) : Math.max(0, proposed);
      change = Math.max(change, Math.abs(value - weights[j]));
      weights[j] = value;
    }
    if (change < 1e-12) { converged = true; break; }
  }
  assert(converged, "Rating fit did not converge");
  const coefficients = Object.fromEntries(names.map((name, i) => [name, weights[i + 1] / scales[i]]));
  const intercept = weights[0] - names.reduce((sum, name, i) => sum + coefficients[name] * means[i], 0);
  return { intercept, coefficients };
}

function predict(row, model) {
  const values = ratingFeatures(row);
  return Math.max(0, model.intercept + Object.entries(model.coefficients).reduce((sum, [key, weight]) => sum + weight * values[key], 0));
}

function metrics(observations) {
  const errors = observations.map(({ expected, predicted }) => Math.abs(expected - predicted)).sort((a, b) => a - b);
  const averageRating = mean(observations.map((row) => row.expected));
  const squaredError = observations.reduce((sum, row) => sum + (row.predicted - row.expected) ** 2, 0);
  return {
    observations: errors.length,
    mae: round(mean(errors)),
    rmse: round(Math.sqrt(squaredError / errors.length)),
    p90AbsoluteError: round(errors[Math.ceil(errors.length * .9) - 1]),
    within010: round(errors.filter((v) => v <= .1).length / errors.length),
    rSquared: round(1 - squaredError / observations.reduce((sum, row) => sum + (row.expected - averageRating) ** 2, 0)),
    bias: round(mean(observations.map((row) => row.predicted - row.expected))),
  };
}

// Select feature set and regularization only inside the 2025 training event.
// All maps and players from a series stay in one fold. 2026 is never fitted.
assert(train.length >= 500 && test.length >= 100, "Insufficient calibration data");
const trainIds = new Set(train.map((row) => row.matchId));
assert(test.every((row) => !trainIds.has(row.matchId)), "Train/test leakage");
const tried = [];
for (const candidate of candidates) for (const ridge of [0, 1, 10]) {
  const predictions = [];
  for (let i = 0; i < 5; i++) {
    const model = fit(train.filter((row) => fold(row) !== i), candidate.features, ridge);
    for (const row of train.filter((row) => fold(row) === i)) predictions.push({ expected: row.rating, predicted: predict(row, model) });
  }
  tried.push({ ...candidate, ridge, crossValidation: metrics(predictions) });
}
tried.sort((a, b) => a.crossValidation.mae - b.crossValidation.mae || a.features.length - b.features.length);
const selected = tried[0];
const fitted = fit(train, selected.features, selected.ridge);
const model = { version: "espumas-vlr-proxy-1", ...fitted, intercept: round(fitted.intercept), coefficients: Object.fromEntries(Object.entries(fitted.coefficients).map(([key, value]) => [key, round(value)])) };
const count = (rows) => ({ playerMaps: rows.length, maps: new Set(rows.map((row) => row.mapId)).size, series: new Set(rows.map((row) => row.matchId)).size });
const predictions = test.map((row) => ({ matchId: row.matchId, mapId: row.mapId, playerId: row.playerId, expected: row.rating, predicted: round(predict(row, model)) }));
const report = { version: model.version, collectedAt: dataset.collectedAt, method: "Sign-constrained ridge regression; 5-fold series-grouped CV on 2025; independent 2026 event holdout", train: { event: "Champions 2025", ...count(train) }, test: { event: "Champions 2026 (completed series only)", ...count(test) }, selected: { name: selected.name, ridge: selected.ridge, crossValidation: selected.crossValidation }, holdout: metrics(predictions), constantBaseline: metrics(test.map((row) => ({ expected: row.rating, predicted: mean(train.map((row) => row.rating)) }))), candidates: tried, predictions };
const runtimeModel = { ...model, calibration: { trainMaps: report.train.maps, testMaps: report.test.maps, testPlayerMaps: report.test.playerMaps, mae: report.holdout.mae, within010: report.holdout.within010 } };
const outputs = [
  ["../lib/vlr/rating-model.json", runtimeModel],
  ["../data/rating-analysis/validation-report.json", report],
];
if (process.argv.includes("--check")) {
  for (const [path, value] of outputs) assert.deepEqual(JSON.parse(await readFile(new URL(path, import.meta.url), "utf8")), value, `Outdated rating artifact: ${path}`);
} else {
  for (const [path, value] of outputs) await writeFile(new URL(path, import.meta.url), JSON.stringify(value, null, 2) + "\n");
}
console.log(JSON.stringify({ model, train: report.train, test: report.test, selected: report.selected, holdout: report.holdout }, null, 2));

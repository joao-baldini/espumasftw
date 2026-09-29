import { readFileSync } from "node:fs";
import { timingSafeEqual } from "node:crypto";
import express from "express";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
const apiKey = process.env.ESPUMAS_API_KEY;
if (!databaseUrl || !apiKey) throw new Error("DATABASE_URL and ESPUMAS_API_KEY are required");

const pool = new pg.Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 30000 });
const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use((_, response, next) => { response.set("Cache-Control", "no-store"); next(); });

const maps = new Set(["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus"]);
const players = new Set(["joao", "ronaldo", "bolla", "rafa", "felipe"]);
const agents = JSON.parse(readFileSync(new URL("../app/agents.json", import.meta.url), "utf8"));
const agentIds = new Set(agents.map((agent) => agent.id));
const abilities = JSON.parse(readFileSync(new URL("../lib/tactics/abilities.json", import.meta.url), "utf8"));
const abilityKeys = new Set(abilities.map((ability) => ability.key));
const noteKeys = new Set(["default", "exec", "execA", "execB", "execC", "postPlantA", "postPlantB", "postPlantC", "retakeA", "retakeB", "retakeC"]);
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const validMap = (map) => maps.has(map);
const sitesForMap = (map) => map === "haven" || map === "lotus" ? ["A", "B", "C"] : ["A", "B"];
const validPhase = (map, phase) => phase === "default" || /^(exec|postPlant|retake)[ABC]$/.test(phase) && sitesForMap(map).includes(phase.at(-1));
const finite = (value) => typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= 10000;
const validColor = (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
const validTeam = (value) => value === "ally" || value === "enemy";

function validBoardItem(item) {
  if (!isObject(item) || typeof item.id !== "string" || item.id.length < 1 || item.id.length > 64) return false;
  if (item.kind === "agent") return agentIds.has(item.agentId) && validTeam(item.team) && finite(item.x) && finite(item.y);
  if (item.kind === "ability") return abilityKeys.has(item.abilityKey) && validTeam(item.team) && finite(item.x) && finite(item.y) && finite(item.rotation);
  if (item.kind === "stroke") return validColor(item.color) && Array.isArray(item.points) && item.points.length >= 2 && item.points.length <= 2000 && item.points.length % 2 === 0 && item.points.every(finite);
  if (item.kind === "arrow") return validColor(item.color) && [item.x, item.y, item.x2, item.y2].every(finite);
  if (item.kind === "text") return validColor(item.color) && finite(item.x) && finite(item.y) && typeof item.text === "string" && item.text.length <= 60;
  return false;
}

function validComposition(map, value) {
  if (!isObject(value) || !isObject(value.picks) || !isObject(value.notes) || typeof value.observations !== "string" || value.observations.length > 5000) return false;
  if (Object.entries(value.picks).some(([player, agent]) => !players.has(player) || !agentIds.has(agent))) return false;
  if (new Set(Object.values(value.picks)).size !== Object.keys(value.picks).length) return false;
  if (Object.entries(value.notes).some(([key, note]) => !noteKeys.has(key) || typeof note !== "string" || note.length > 5000 || key.endsWith("C") && !sitesForMap(map).includes("C"))) return false;
  return true;
}

function authorized(request) {
  const supplied = request.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const expected = Buffer.from(apiKey);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

app.get("/healthz", async (_request, response) => {
  try { await pool.query("SELECT 1"); response.json({ ok: true }); }
  catch { response.status(503).json({ ok: false }); }
});
app.use("/api", (request, response, next) => authorized(request) ? next() : response.status(401).json({ error: "Não autorizado." }));

app.get("/api/compositions", async (_request, response) => {
  const { rows } = await pool.query("SELECT map, picks, notes, observations, updated_at FROM espumas.compositions");
  response.json(Object.fromEntries(rows.map((row) => [row.map, { picks: row.picks, notes: row.notes, observations: row.observations, updatedAt: row.updated_at }])));
});
app.put("/api/compositions/:map", async (request, response) => {
  const { map } = request.params;
  if (!validMap(map)) return response.status(404).json({ error: "Mapa inválido." });
  if (!validComposition(map, request.body)) return response.status(400).json({ error: "Composição inválida." });
  const { picks, notes, observations } = request.body;
  const { rows } = await pool.query("INSERT INTO espumas.compositions (map, picks, notes, observations) VALUES ($1, $2, $3, $4) ON CONFLICT(map) DO UPDATE SET picks = EXCLUDED.picks, notes = EXCLUDED.notes, observations = EXCLUDED.observations, updated_at = now() RETURNING updated_at", [map, picks, notes, observations]);
  response.json({ picks, notes, observations, updatedAt: rows[0].updated_at });
});

app.get("/api/training-results", async (_request, response) => {
  const { rows } = await pool.query("SELECT map, wins, losses FROM espumas.training_results");
  response.json(Object.fromEntries(rows.map(({ map, wins, losses }) => [map, { wins, losses }])));
});
app.put("/api/training-results/:map", async (request, response) => {
  const { map } = request.params;
  if (!validMap(map)) return response.status(404).json({ error: "Mapa inválido." });
  const { wins, losses } = request.body ?? {};
  if (![wins, losses].every((value) => Number.isSafeInteger(value) && value >= 0 && value <= 99999)) return response.status(400).json({ error: "Resultado inválido." });
  await pool.query("INSERT INTO espumas.training_results (map, wins, losses) VALUES ($1, $2, $3) ON CONFLICT(map) DO UPDATE SET wins = EXCLUDED.wins, losses = EXCLUDED.losses, updated_at = now()", [map, wins, losses]);
  response.json({ wins, losses });
});

app.get("/api/team-observations", async (_request, response) => {
  const { rows } = await pool.query("SELECT observations, updated_at FROM espumas.team_observations WHERE id = 1");
  response.json(rows[0] ? { observations: rows[0].observations, updatedAt: rows[0].updated_at } : { observations: "", updatedAt: null });
});
app.put("/api/team-observations", async (request, response) => {
  const observations = request.body?.observations;
  if (typeof observations !== "string" || observations.length > 5000) return response.status(400).json({ error: "Observações inválidas." });
  const { rows } = await pool.query("INSERT INTO espumas.team_observations (id, observations) VALUES (1, $1) ON CONFLICT(id) DO UPDATE SET observations = EXCLUDED.observations, updated_at = now() RETURNING updated_at", [observations]);
  response.json({ observations, updatedAt: rows[0].updated_at });
});

app.get("/api/tactics", async (_request, response) => {
  const { rows } = await pool.query("SELECT map, phase, items, updated_at FROM espumas.tactics_boards");
  response.json(Object.fromEntries(rows.map(({ map, phase, items, updated_at }) => [`${map}:${phase}`, { items, updatedAt: updated_at }])));
});
app.put("/api/tactics/:map/:phase", async (request, response) => {
  const { map, phase } = request.params;
  if (!validMap(map) || !validPhase(map, phase)) return response.status(404).json({ error: "Mapa ou fase inválida." });
  const items = request.body?.items;
  if (!Array.isArray(items) || items.length > 400 || items.some((item) => !validBoardItem(item)) || new Set(items.map((item) => item.id)).size !== items.length) return response.status(400).json({ error: "Quadro inválido." });
  const { rows } = await pool.query("INSERT INTO espumas.tactics_boards (map, phase, items) VALUES ($1, $2, $3) ON CONFLICT(map, phase) DO UPDATE SET items = EXCLUDED.items, updated_at = now() RETURNING updated_at", [map, phase, JSON.stringify(items)]);
  response.json({ items, updatedAt: rows[0].updated_at });
});

app.use((error, _request, response, _next) => {
  console.error("API request failed", error);
  if (error?.type === "entity.too.large") return response.status(413).json({ error: "Dados muito grandes." });
  if (error instanceof SyntaxError) return response.status(400).json({ error: "JSON inválido." });
  response.status(503).json({ error: "Dados indisponíveis no momento." });
});

const port = Number(process.env.PORT) || 10000;
app.listen(port, "0.0.0.0", () => console.log(`Espumas API listening on ${port}`));

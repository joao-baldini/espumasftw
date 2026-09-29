import pg from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED;
if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is required for import");
const origin = process.env.LEGACY_DATA_ORIGIN ?? "https://valorant-comps-fiap.jvbaldini2906.chatgpt.site";
const observationsPrefix = "\u001eESPUMAS_OBSERVATIONS_V1\n";

async function read(path) {
  const response = await fetch(`${origin}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Legacy API ${path} returned ${response.status}`);
  return response.json();
}

function unpackNotes(stored) {
  const notes = typeof stored === "string" ? JSON.parse(stored) : { ...stored };
  const value = notes.default;
  if (typeof value === "string" && value.startsWith(observationsPrefix)) {
    const parts = JSON.parse(value.slice(observationsPrefix.length));
    if (Array.isArray(parts) && parts.length === 2 && parts.every((part) => typeof part === "string")) {
      notes.default = parts[0];
      return { notes, observations: parts[1] };
    }
  }
  return { notes, observations: "" };
}

const [compositions, trainingResults, teamObservations] = await Promise.all([
  read("/api/compositions"), read("/api/training-results"), read("/api/team-observations"),
]);
const client = new pg.Client({ connectionString });
try {
  await client.connect();
  await client.query("BEGIN");
  for (const [map, composition] of Object.entries(compositions)) {
    const { notes, observations } = unpackNotes(composition.notes);
    await client.query("INSERT INTO espumas.compositions (map, picks, notes, observations, updated_at) VALUES ($1, $2, $3, $4, $5) ON CONFLICT(map) DO UPDATE SET picks = EXCLUDED.picks, notes = EXCLUDED.notes, observations = EXCLUDED.observations, updated_at = EXCLUDED.updated_at", [map, composition.picks, notes, observations, composition.updatedAt ?? new Date().toISOString()]);
  }
  for (const [map, result] of Object.entries(trainingResults)) {
    await client.query("INSERT INTO espumas.training_results (map, wins, losses) VALUES ($1, $2, $3) ON CONFLICT(map) DO UPDATE SET wins = EXCLUDED.wins, losses = EXCLUDED.losses, updated_at = now()", [map, result.wins, result.losses]);
  }
  if (teamObservations && typeof teamObservations.observations === "string") {
    await client.query("INSERT INTO espumas.team_observations (id, observations, updated_at) VALUES (1, $1, $2) ON CONFLICT(id) DO UPDATE SET observations = EXCLUDED.observations, updated_at = EXCLUDED.updated_at", [teamObservations.observations, teamObservations.updatedAt ?? new Date().toISOString()]);
  }
  await client.query("COMMIT");
  console.log(`Imported ${Object.keys(compositions).length} compositions, ${Object.keys(trainingResults).length} training records and team observations`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}

import { env } from "cloudflare:workers";

export type Composition = { picks: Record<string, string>; notes: string; updatedAt?: string };
type CompositionRow = { map: string; picks: string; notes: string; updated_at: string };

function getBinding() {
  if (!env.DB) throw new Error("D1 binding DB unavailable");
  return env.DB;
}

export async function getCompositions(): Promise<Record<string, Composition>> {
  const rows = await getBinding().prepare("SELECT map, picks, notes, updated_at FROM compositions").all<CompositionRow>();
  return Object.fromEntries((rows.results ?? []).map((row) => [row.map, { picks: JSON.parse(row.picks), notes: row.notes, updatedAt: row.updated_at }]));
}

export async function putComposition(map: string, composition: Composition): Promise<Composition> {
  const updatedAt = new Date().toISOString();
  await getBinding().prepare("INSERT INTO compositions (map, picks, notes, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(map) DO UPDATE SET picks = excluded.picks, notes = excluded.notes, updated_at = excluded.updated_at")
    .bind(map, JSON.stringify(composition.picks), composition.notes, updatedAt).run();
  return { ...composition, updatedAt };
}

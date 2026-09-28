import { type Composition, normalizeNotes, packNotes, unpackNotes } from "@/lib/composition";

const dataOrigin = process.env.ESPUMAS_DATA_ORIGIN ?? "https://valorant-comps-fiap.jvbaldini2906.chatgpt.site";

export async function getCompositions(): Promise<Record<string, Composition>> {
  const response = await fetch(`${dataOrigin}/api/compositions`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  const compositions = await response.json() as Record<string, Composition>;
  return Object.fromEntries(Object.entries(compositions).map(([map, composition]) => [map, { ...composition, ...unpackNotes(normalizeNotes(composition.notes)) }]));
}

export async function putComposition(map: string, composition: Composition): Promise<Composition> {
  const response = await fetch(`${dataOrigin}/api/compositions/${map}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ picks: composition.picks, notes: packNotes(composition.notes, composition.observations) }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  const saved = await response.json() as Composition;
  return { ...composition, updatedAt: saved.updatedAt };
}

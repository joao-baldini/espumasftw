import { type Composition, normalizeNotes, packNotes, unpackNotes } from "@/lib/composition";
import { backendFetch, usingRenderBackend } from "./backend";

export async function getCompositions(): Promise<Record<string, Composition>> {
  const response = await backendFetch("/api/compositions");
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  const compositions = await response.json() as Record<string, Composition>;
  return Object.fromEntries(Object.entries(compositions).map(([map, composition]) => {
    const unpacked = unpackNotes(normalizeNotes(composition.notes));
    return [map, { ...composition, notes: unpacked.notes, observations: composition.observations ?? unpacked.observations }];
  }));
}

export async function putComposition(map: string, composition: Composition): Promise<Composition> {
  const response = await backendFetch(`/api/compositions/${map}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(usingRenderBackend ? { picks: composition.picks, notes: composition.notes, observations: composition.observations ?? "" } : { picks: composition.picks, notes: packNotes(composition.notes, composition.observations) }),
  });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  const saved = await response.json() as Composition;
  return { ...composition, updatedAt: saved.updatedAt };
}

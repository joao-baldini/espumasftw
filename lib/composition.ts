export const noteKeys = [
  "default", "exec", "postPlantA", "postPlantB", "postPlantC",
  "retakeA", "retakeB", "retakeC",
] as const;

export type NoteKey = typeof noteKeys[number];
export type Notes = Partial<Record<NoteKey, string>>;
export type Composition = { picks: Record<string, string>; notes: Notes; observations?: string; updatedAt?: string };

export const maxNoteLength = 5000;
const observationsPrefix = "\u001eESPUMAS_OBSERVATIONS_V1\n";

// The shared data service only accepts the existing phase keys. Keep the new
// field in the default slot and unpack it at this app's API boundary.
export function packNotes(notes: Notes, observations = ""): Notes {
  if (!observations) return notes;
  return { ...notes, default: observationsPrefix + JSON.stringify([notes.default ?? "", observations]) };
}

export function unpackNotes(notes: Notes): { notes: Notes; observations: string } {
  const storedDefault = notes.default;
  if (storedDefault?.startsWith(observationsPrefix)) {
    try {
      const value: unknown = JSON.parse(storedDefault.slice(observationsPrefix.length));
      if (Array.isArray(value) && value.length === 2 && value.every((part) => typeof part === "string")) {
        return { notes: { ...notes, default: value[0] }, observations: value[1] };
      }
    } catch { /* Treat malformed or legacy content as a procedure. */ }
  }
  return { notes, observations: "" };
}

export function sitesForMap(map: string): Array<"A" | "B" | "C"> {
  return map === "haven" || map === "lotus" ? ["A", "B", "C"] : ["A", "B"];
}

export function normalizeNotes(value: unknown): Notes {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return normalizeNotes(parsed);
    } catch { /* Legacy free-form note. */ }
    return value ? { default: value } : {};
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key, note]) => noteKeys.includes(key as NoteKey) && typeof note === "string")) as Notes;
}

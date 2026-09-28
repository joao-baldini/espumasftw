export const noteKeys = [
  "default", "exec", "postPlantA", "postPlantB", "postPlantC",
  "retakeA", "retakeB", "retakeC",
] as const;

export type NoteKey = typeof noteKeys[number];
export type Notes = Partial<Record<NoteKey, string>>;
export type Composition = { picks: Record<string, string>; notes: Notes; updatedAt?: string };

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

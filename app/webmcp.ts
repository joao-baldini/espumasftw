import { maxNoteLength, noteKeys, sitesForMap, type Composition, type NoteKey } from "@/lib/composition";
type ModelContext = {
  registerTool: (tool: {
    name: string;
    title: string;
    description: string;
    inputSchema: object;
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
    execute: (input: unknown) => Promise<unknown>;
  }, options: { signal: AbortSignal }) => void | Promise<void>;
};

const maps = new Set(["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus"]);
const players = new Set(["joao", "ronaldo", "bolla", "rafa", "felipe"]);

export function registerCompositionTool(onSaved: (map: string, composition: Composition) => void) {
  const context = (document as Document & { modelContext?: ModelContext }).modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  void Promise.resolve(context.registerTool({
    name: "save_valorant_composition",
    title: "Salvar composição de Valorant",
    description: "Salva os agentes dos cinco jogadores, os procedimentos e as observações em um mapa do campeonato.",
    inputSchema: {
      type: "object",
      properties: {
        map: { type: "string", enum: [...maps] },
        picks: { type: "object", additionalProperties: { type: "string" } },
        notes: { type: "object", properties: Object.fromEntries(noteKeys.map((key) => [key, { type: "string", maxLength: 5000 }])), additionalProperties: false },
        observations: { type: "string", maxLength: 5000 },
      },
      required: ["map", "picks", "notes"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, untrustedContentHint: false },
    async execute(input) {
      if (!input || typeof input !== "object") throw new Error("Dados inválidos.");
      const { map, picks, notes, observations } = input as { map?: unknown; picks?: unknown; notes?: unknown; observations?: unknown };
      if (typeof map !== "string" || !maps.has(map) || !notes || typeof notes !== "object" || Array.isArray(notes) || !picks || typeof picks !== "object" || Array.isArray(picks)) throw new Error("Dados inválidos.");
      const entries = Object.entries(picks);
      if (entries.some(([player, agent]) => !players.has(player) || typeof agent !== "string") || new Set(entries.map(([, agent]) => agent)).size !== entries.length) throw new Error("Jogadores ou agentes inválidos.");
      if (Object.entries(notes).some(([key, note]) => !noteKeys.includes(key as NoteKey) || typeof note !== "string" || note.length > maxNoteLength || (key.endsWith("C") && !sitesForMap(map).includes("C")))) throw new Error("Procedimentos inválidos.");
      if (observations !== undefined && (typeof observations !== "string" || observations.length > maxNoteLength)) throw new Error("Observações inválidas.");
      const response = await fetch(`/api/compositions/${map}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ picks, notes, observations }) });
      if (!response.ok) throw new Error("Não foi possível salvar a composição.");
      const saved = await response.json() as Composition;
      onSaved(map, saved);
      return { map, saved: true, updatedAt: saved.updatedAt };
    },
  }, { signal: lifecycle.signal })).catch((error) => console.error("WebMCP registration failed", error));
  return () => lifecycle.abort();
}

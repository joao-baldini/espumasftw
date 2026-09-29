import { getCompositions, putComposition } from "@/db/compositions";
import { usingRenderBackend } from "@/db/backend";
import agents from "@/app/agents.json";
import { maxNoteLength, noteKeys, packNotes, sitesForMap, type NoteKey, type Notes } from "@/lib/composition";

const maps = new Set(["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus"]);
const players = new Set(["joao", "ronaldo", "bolla", "rafa", "felipe"]);
const agentIds = new Set(agents.map((agent) => agent.id));

export async function PUT(request: Request, context: { params: Promise<{ map: string }> }) {
  const { map } = await context.params;
  if (!maps.has(map)) return Response.json({ error: "Mapa inválido." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Composição inválida." }, { status: 400 });
  const value = body as { picks?: unknown; notes?: unknown; observations?: unknown };
  if (!value.picks || typeof value.picks !== "object" || Array.isArray(value.picks) || !value.notes || typeof value.notes !== "object" || Array.isArray(value.notes)) return Response.json({ error: "Composição inválida." }, { status: 400 });
  const picks = value.picks as Record<string, unknown>;
  const notes = value.notes as Record<string, unknown>;
  const availableSites = sitesForMap(map);
  if (Object.entries(notes).some(([key, note]) => !noteKeys.includes(key as NoteKey) || typeof note !== "string" || note.length > maxNoteLength || (key.endsWith("C") && !availableSites.includes("C")))) return Response.json({ error: "Procedimentos inválidos." }, { status: 400 });
  if (value.observations !== undefined && (typeof value.observations !== "string" || value.observations.length > maxNoteLength)) return Response.json({ error: "Observações inválidas." }, { status: 400 });
  if (Object.entries(picks).some(([player, agent]) => !players.has(player) || typeof agent !== "string" || !agentIds.has(agent))) return Response.json({ error: "Agente ou jogador inválido." }, { status: 400 });
  if (new Set(Object.values(picks)).size !== Object.keys(picks).length) return Response.json({ error: "Um agente não pode ser escolhido duas vezes." }, { status: 400 });
  try {
    const observations = value.observations === undefined ? (await getCompositions())[map]?.observations ?? "" : value.observations as string;
    if (!usingRenderBackend && (packNotes(notes as Notes, observations).default?.length ?? 0) > maxNoteLength) return Response.json({ error: "Default e Observações excedem o limite compartilhado de 5000 caracteres." }, { status: 400 });
    return Response.json(await putComposition(map, { picks: picks as Record<string, string>, notes: notes as Notes, observations }));
  } catch (error) {
    console.error("Failed to save composition", error);
    return Response.json({ error: "Não foi possível salvar." }, { status: 503 });
  }
}

import { putComposition } from "@/db/compositions";
import agents from "@/app/agents.json";

const maps = new Set(["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus"]);
const players = new Set(["joao", "ronaldo", "bolla", "rafa", "felipe"]);
const agentIds = new Set(agents.map((agent) => agent.id));

export async function PUT(request: Request, context: { params: Promise<{ map: string }> }) {
  const { map } = await context.params;
  if (!maps.has(map)) return Response.json({ error: "Mapa inválido." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object") return Response.json({ error: "Composição inválida." }, { status: 400 });
  const value = body as { picks?: unknown; notes?: unknown };
  if (!value.picks || typeof value.picks !== "object" || Array.isArray(value.picks) || typeof value.notes !== "string" || value.notes.length > 5000) return Response.json({ error: "Composição inválida." }, { status: 400 });
  const picks = value.picks as Record<string, unknown>;
  if (Object.entries(picks).some(([player, agent]) => !players.has(player) || typeof agent !== "string" || !agentIds.has(agent))) return Response.json({ error: "Agente ou jogador inválido." }, { status: 400 });
  if (new Set(Object.values(picks)).size !== Object.keys(picks).length) return Response.json({ error: "Um agente não pode ser escolhido duas vezes." }, { status: 400 });
  try {
    return Response.json(await putComposition(map, { picks: picks as Record<string, string>, notes: value.notes }));
  } catch (error) {
    console.error("Failed to save composition", error);
    return Response.json({ error: "Não foi possível salvar." }, { status: 503 });
  }
}

import { putTactics } from "@/db/tactics";
import { sitesForMap } from "@/lib/composition";
import type { BoardItem } from "@/lib/tactics/board";

const maps = new Set(["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus"]);

export async function PUT(request: Request, context: { params: Promise<{ map: string; phase: string }> }) {
  const { map, phase } = await context.params;
  if (!maps.has(map) || !(phase === "default" || /^(exec|postPlant|retake)[ABC]$/.test(phase) && sitesForMap(map).includes(phase.at(-1) as "A" | "B" | "C"))) return Response.json({ error: "Mapa ou fase inválida." }, { status: 404 });
  let body: { items?: unknown };
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!Array.isArray(body?.items) || body.items.length > 400) return Response.json({ error: "Quadro inválido." }, { status: 400 });
  try { return Response.json(await putTactics(map, phase, body.items as BoardItem[])); }
  catch (error) { console.error("Failed to save tactics", error); return Response.json({ error: "Não foi possível salvar o quadro tático." }, { status: 503 }); }
}

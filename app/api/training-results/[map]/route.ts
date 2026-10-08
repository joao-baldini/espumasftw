import { putTrainingResult } from "@/db/training-results";

const maps = new Set(["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus", "corrode", "bind"]);

export async function PUT(request: Request, context: { params: Promise<{ map: string }> }) {
  const { map } = await context.params;
  if (!maps.has(map)) return Response.json({ error: "Mapa inválido." }, { status: 404 });
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Resultado inválido." }, { status: 400 });
  const { wins, losses } = body as Record<string, unknown>;
  if (![wins, losses].every((value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 99999)) {
    return Response.json({ error: "Vitórias e derrotas devem ser números inteiros de 0 a 99999." }, { status: 400 });
  }
  try {
    return Response.json(await putTrainingResult(map, { wins: wins as number, losses: losses as number }));
  } catch (error) {
    console.error("Failed to save training result", error);
    return Response.json({ error: "Não foi possível salvar o resultado." }, { status: 503 });
  }
}

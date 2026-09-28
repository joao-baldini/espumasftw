import { getTeamObservations, putTeamObservations } from "@/db/team-observations";
import { maxNoteLength } from "@/lib/composition";

export async function GET() {
  try {
    return Response.json(await getTeamObservations(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load team observations", error);
    return Response.json({ error: "Dados indisponíveis no momento." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "JSON inválido." }, { status: 400 }); }
  const observations = (body as { observations?: unknown } | null)?.observations;
  if (typeof observations !== "string" || observations.length > maxNoteLength) return Response.json({ error: "Observações inválidas." }, { status: 400 });
  try {
    return Response.json(await putTeamObservations(observations));
  } catch (error) {
    console.error("Failed to save team observations", error);
    return Response.json({ error: "Não foi possível salvar." }, { status: 503 });
  }
}

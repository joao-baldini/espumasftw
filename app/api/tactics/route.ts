import { getTactics } from "@/db/tactics";

export async function GET() {
  try { return Response.json(await getTactics()); }
  catch (error) { console.error("Failed to load tactics", error); return Response.json({ error: "Não foi possível carregar o quadro tático." }, { status: 503 }); }
}

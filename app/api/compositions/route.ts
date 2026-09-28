import { getCompositions } from "@/db/compositions";

export async function GET() {
  try {
    return Response.json(await getCompositions(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load compositions", error);
    return Response.json({ error: "Dados indisponíveis no momento." }, { status: 503 });
  }
}

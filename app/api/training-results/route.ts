import { getTrainingResults } from "@/db/training-results";

export async function GET() {
  try {
    return Response.json(await getTrainingResults());
  } catch (error) {
    console.error("Failed to load training results", error);
    return Response.json({ error: "Não foi possível carregar os resultados." }, { status: 503 });
  }
}

import type { TrainingResult } from "@/lib/training-results";

const dataOrigin = process.env.ESPUMAS_DATA_ORIGIN ?? "https://valorant-comps-fiap.jvbaldini2906.chatgpt.site";

export async function getTrainingResults(): Promise<Record<string, TrainingResult>> {
  const response = await fetch(`${dataOrigin}/api/training-results`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  return await response.json() as Record<string, TrainingResult>;
}

export async function putTrainingResult(map: string, result: TrainingResult): Promise<TrainingResult> {
  const response = await fetch(`${dataOrigin}/api/training-results/${map}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  return await response.json() as TrainingResult;
}

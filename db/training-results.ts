import type { TrainingResult } from "@/lib/training-results";
import { backendFetch } from "./backend";

export async function getTrainingResults(): Promise<Record<string, TrainingResult>> {
  const response = await backendFetch("/api/training-results");
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  return await response.json() as Record<string, TrainingResult>;
}

export async function putTrainingResult(map: string, result: TrainingResult): Promise<TrainingResult> {
  const response = await backendFetch(`/api/training-results/${map}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(result),
  });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  return await response.json() as TrainingResult;
}

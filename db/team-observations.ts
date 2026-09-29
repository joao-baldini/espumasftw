import { backendFetch } from "./backend";

export type TeamObservations = { observations: string; updatedAt: string | null };

export async function getTeamObservations(): Promise<TeamObservations> {
  const response = await backendFetch("/api/team-observations");
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  return await response.json() as TeamObservations;
}

export async function putTeamObservations(observations: string): Promise<TeamObservations> {
  const response = await backendFetch("/api/team-observations", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observations }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error ?? `Data service responded ${response.status}`);
  }
  return await response.json() as TeamObservations;
}

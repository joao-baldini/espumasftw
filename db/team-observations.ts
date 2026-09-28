const dataOrigin = process.env.ESPUMAS_DATA_ORIGIN ?? "https://valorant-comps-fiap.jvbaldini2906.chatgpt.site";

export type TeamObservations = { observations: string; updatedAt: string | null };

export async function getTeamObservations(): Promise<TeamObservations> {
  const response = await fetch(`${dataOrigin}/api/team-observations`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Data service responded ${response.status}`);
  return await response.json() as TeamObservations;
}

export async function putTeamObservations(observations: string): Promise<TeamObservations> {
  const response = await fetch(`${dataOrigin}/api/team-observations`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ observations }),
    cache: "no-store",
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(result.error ?? `Data service responded ${response.status}`);
  }
  return await response.json() as TeamObservations;
}

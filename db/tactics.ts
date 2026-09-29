import { backendFetch } from "./backend";
import type { BoardItem } from "@/lib/tactics/board";

export async function getTactics(): Promise<Record<string, { items: BoardItem[]; updatedAt: string }>> {
  const response = await backendFetch("/api/tactics");
  if (!response.ok) throw new Error(`Tactics load failed: ${response.status}`);
  return response.json();
}

export async function putTactics(map: string, phase: string, items: BoardItem[]) {
  const response = await backendFetch(`/api/tactics/${map}/${phase}`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error(`Tactics save failed: ${response.status}`);
  return response.json();
}

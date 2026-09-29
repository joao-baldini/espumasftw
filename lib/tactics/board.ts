import mapData from "./maps.json";

// Board coordinates cover the minimap image from 0 to boardSize on both axes.
export const boardSize = 1000;

export type Team = "ally" | "enemy";
export type BoardItem =
  | { kind: "agent"; id: string; agentId: string; team: Team; x: number; y: number }
  | { kind: "ability"; id: string; abilityKey: string; team: Team; x: number; y: number; rotation: number }
  | { kind: "stroke"; id: string; points: number[]; color: string }
  | { kind: "arrow"; id: string; x: number; y: number; x2: number; y2: number; color: string }
  | { kind: "text"; id: string; x: number; y: number; text: string; color: string };

export type Callout = { name: string; x: number; y: number };
type MapInfo = { meter: number; callouts: Callout[] };

export function mapInfo(map: string) {
  const info = (mapData as Record<string, MapInfo>)[map];
  return { meter: info.meter * boardSize, callouts: info.callouts.map((callout) => ({ ...callout, x: callout.x * boardSize, y: callout.y * boardSize })) };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

export function moveItem(item: BoardItem, dx: number, dy: number): BoardItem {
  switch (item.kind) {
    case "stroke": return { ...item, points: item.points.map((value, index) => value + (index % 2 ? dy : dx)) };
    case "arrow": return { ...item, x: item.x + dx, y: item.y + dy, x2: item.x2 + dx, y2: item.y2 + dy };
    default: return { ...item, x: item.x + dx, y: item.y + dy };
  }
}

export type History = { past: BoardItem[][]; present: BoardItem[]; future: BoardItem[][] };
export const emptyHistory = (): History => ({ past: [], present: [], future: [] });
const historyLimit = 100;

export function commit(history: History, present: BoardItem[]): History {
  return { past: [...history.past, history.present].slice(-historyLimit), present, future: [] };
}

export function undo(history: History): History {
  const previous = history.past.at(-1);
  if (!previous) return history;
  return { past: history.past.slice(0, -1), present: previous, future: [history.present, ...history.future] };
}

export function redo(history: History): History {
  const [next, ...future] = history.future;
  if (!next) return history;
  return { past: [...history.past, history.present], present: next, future };
}

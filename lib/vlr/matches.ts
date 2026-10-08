import firstMatch from "@/data/vlr/espumas-esponjas-2026-10-07.json";
import type { ValorantMatch } from "./types";

export const matches: ValorantMatch[] = [firstMatch as unknown as ValorantMatch].sort((a, b) => b.date.localeCompare(a.date));

export { formatDuration, formatMatchDate, leaderboardRows, seriesScore, totalRounds } from "./stats";

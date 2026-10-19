import firstMatch from "@/data/vlr/espumas-esponjas-2026-10-07.json";
import esponjasRematch from "@/data/vlr/espumas-esponjas-2026-10-14.json";
import buchas from "@/data/vlr/espumas-buchas-2026-10-13.json";
import loucas from "@/data/vlr/espumas-loucas-2026-10-13.json";
import molhados from "@/data/vlr/espumas-molhados-2026-10-13.json";
import sabonetes from "@/data/vlr/espumas-sabonetes-2026-10-16.json";
import ralos from "@/data/vlr/espumas-ralos-2026-10-16.json";
import escorredores from "@/data/vlr/espumas-escorredores-2026-10-16.json";
import nexLotus from "@/data/vlr/espumas-edu-e-amigos-fiap-nex-2026-10-17-lotus.json";
import nexAscent from "@/data/vlr/espumas-os-maga-las-fiap-nex-2026-10-17-ascent.json";
import nexBindLoss from "@/data/vlr/espumas-fiapinhos-fiap-nex-2026-10-17-bind.json";
import nexBindWin from "@/data/vlr/espumas-edu-e-amigos-fiap-nex-2026-10-17-bind.json";
import nexAllan from "@/data/vlr/espumas-allan-e-amigos-fiap-nex-2026-10-18-bind.json";
import ascentRounds from "@/data/tracker-rounds/ascent-2026-10-07.json";
import splitRounds from "@/data/tracker-rounds/split-2026-10-07.json";
import summitRounds from "@/data/tracker-rounds/summit-2026-10-07.json";
import lotusRounds from "@/data/tracker-rounds/lotus-2026-10-13.json";
import havenRounds from "@/data/tracker-rounds/haven-2026-10-13.json";
import abyssRounds from "@/data/tracker-rounds/abyss-2026-10-13.json";
import corrodeRounds from "@/data/tracker-rounds/corrode-2026-10-14.json";
import bindRounds from "@/data/tracker-rounds/bind-2026-10-14.json";
import lotusOctober16 from "@/data/tracker-rounds/lotus-2026-10-16.json";
import abyssOctober16 from "@/data/tracker-rounds/abyss-2026-10-16.json";
import bindOctober16 from "@/data/tracker-rounds/bind-2026-10-16.json";
import nexLotusRounds from "@/data/tracker-rounds/lotus-2026-10-17.json";
import nexAscentRounds from "@/data/tracker-rounds/ascent-2026-10-17.json";
import nexBindLossRounds from "@/data/tracker-rounds/bind-loss-2026-10-17.json";
import nexBindWinRounds from "@/data/tracker-rounds/bind-win-2026-10-17.json";
import nexAllanRounds from "@/data/tracker-rounds/bind-2026-10-18.json";
import type { TrackerRounds, ValorantMatch } from "./types";

export const matches: ValorantMatch[] = [nexAllan, nexBindWin, nexBindLoss, nexAscent, nexLotus, escorredores, ralos, sabonetes, esponjasRematch, molhados, loucas, buchas, firstMatch].map((match) => match as unknown as ValorantMatch).sort((a, b) => b.date.localeCompare(a.date));

const trackerRounds: TrackerRounds[] = [ascentRounds, splitRounds, summitRounds, lotusRounds, havenRounds, abyssRounds, corrodeRounds, bindRounds, lotusOctober16, abyssOctober16, bindOctober16, nexLotusRounds, nexAscentRounds, nexBindLossRounds, nexBindWinRounds, nexAllanRounds];

// Round-by-round Tracker data is only needed on the match page, so it is attached there.
export function withTrackerRounds(match: ValorantMatch): ValorantMatch {
  return { ...match, maps: match.maps.map((map) => ({ ...map, tracker: trackerRounds.find((entry) => entry.matchId === match.id && entry.map === map.id) })) };
}

export { formatDuration, formatMatchDate, leaderboardRows, seriesScore, totalRounds } from "./stats";

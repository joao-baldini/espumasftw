import type { Metadata } from "next";
import { matches } from "@/lib/vlr/matches";
import { MatchPage } from "./match-page";

export const metadata: Metadata = {
  title: "VLR dos Espumas — Partidas e estatísticas",
  description: "Resultados, agentes e leaderboards por mapa das partidas do time Espumas.",
};

export default function VlrPage() {
  return <MatchPage match={matches[0]} />;
}

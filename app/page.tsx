"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, RefreshCw, Search, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import agents from "./agents.json";
import { registerCompositionTool } from "./webmcp";

type Agent = { id: string; name: string; role: string; icon: string };
type Composition = { picks: Record<string, string>; notes: string; updatedAt?: string };
const players = ["joao", "ronaldo", "bolla", "rafa", "felipe"];
const maps = ["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus"];
const mapNames: Record<string, string> = Object.fromEntries(maps.map((map) => [map, map.charAt(0).toUpperCase() + map.slice(1)]));
const agentList = agents as Agent[];
const emptyComposition = (): Composition => ({ picks: {}, notes: "" });

export default function Home() {
  const [selectedMap, setSelectedMap] = useState("abyss");
  const [compositions, setCompositions] = useState<Record<string, Composition>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = compositions[selectedMap] ?? emptyComposition();
  const picked = players.filter((player) => current.picks[player]).length;
  const filteredAgents = useMemo(() => agentList.filter((agent) => `${agent.name} ${agent.role}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [query]);

  async function load() {
    setLoadState("loading");
    try {
      const response = await fetch("/api/compositions", { cache: "no-store" });
      if (!response.ok) throw new Error();
      setCompositions(await response.json() as Record<string, Composition>);
      setLoadState("ready");
      setSaveState("saved");
    } catch { setLoadState("error"); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => registerCompositionTool((map, composition) => {
    setCompositions((previous) => ({ ...previous, [map]: composition }));
    setSaveState("saved");
  }), []);

  async function save(map: string, composition: Composition) {
    setSaveState("saving");
    try {
      const response = await fetch(`/api/compositions/${map}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(composition) });
      if (!response.ok) throw new Error();
      const result = await response.json() as Composition;
      setCompositions((previous) => ({ ...previous, [map]: { ...previous[map], updatedAt: result.updatedAt } }));
      setSaveState("saved");
    } catch { setSaveState("error"); }
  }
  function updateCurrent(update: Partial<Composition>) {
    const next = { ...current, ...update };
    setCompositions((previous) => ({ ...previous, [selectedMap]: next }));
    if (pendingSave.current) clearTimeout(pendingSave.current);
    setSaveState("saving");
    pendingSave.current = setTimeout(() => { void save(selectedMap, next); pendingSave.current = null; }, 700);
  }
  function chooseMap(map: string) {
    if (pendingSave.current) { clearTimeout(pendingSave.current); pendingSave.current = null; void save(selectedMap, current); }
    setSelectedMap(map);
  }
  function chooseAgent(agentId: string) {
    if (!pickerFor) return;
    updateCurrent({ picks: { ...current.picks, [pickerFor]: agentId } });
    setPickerFor(null); setQuery("");
  }

  return <div className="app-shell">
    <header className="topbar"><div className="brand"><span className="brand-mark">V</span><div><strong>COMP LAB</strong><small>CAMPEONATO VALORANT</small></div></div><div className="topbar-right"><span className="team-chip"><span className="team-dot" /> NOSSO TIME</span><span className="edition">TEMPORADA 2026</span></div></header>
    <div className="workspace">
      <aside className="map-sidebar" aria-label="Mapas do campeonato"><div className="sidebar-heading"><span>MAP POOL</span><span className="count">07 MAPAS</span></div><div className="map-list">{maps.map((map, index) => {
        const assigned = players.filter((player) => compositions[map]?.picks[player]).length;
        return <button key={map} className={`map-tile ${selectedMap === map ? "active" : ""}`} onClick={() => chooseMap(map)} aria-current={selectedMap === map ? "page" : undefined}><img src={`/maps/${map}-thumb.png`} alt="" /><span className="map-shade" /><span className="map-index">0{index + 1}</span><span className="map-info"><strong>{mapNames[map]}</strong><small>{assigned}/5 AGENTES</small></span><ArrowUpRight size={16} className="map-arrow" /></button>;
      })}</div><div className="sidebar-footer"><span className="side-accent" /> PLANEJAMENTO DE EQUIPE</div></aside>
      <main className="main-area"><div className="section-kicker"><span className="pink-line" /> COMPOSIÇÃO POR MAPA <span className="kicker-slash">/</span> {mapNames[selectedMap].toUpperCase()}</div><div className="page-heading"><div><h1>{mapNames[selectedMap]}</h1><p>Defina os agentes de cada jogador e registre a estratégia.</p></div><div className="save-status" role="status"><span className={`status-dot ${saveState}`} />{loadState === "loading" ? "Carregando" : loadState === "error" ? "Sem conexão" : saveState === "saving" ? "Salvando" : saveState === "error" ? "Erro ao salvar" : "Tudo salvo"}</div></div>
        <div className="map-hero"><img src={`/maps/${selectedMap}.webp`} alt={`Imagem do mapa ${mapNames[selectedMap]}`} /><div className="hero-overlay" /><span className="hero-label">MAPA 0{maps.indexOf(selectedMap) + 1} <span>—</span> VALORANT</span><strong>{mapNames[selectedMap].toUpperCase()}</strong><span className="hero-corner">COMPOSIÇÃO {picked.toString().padStart(2, "0")}/05</span></div>
        {loadState === "error" && <div className="error-banner">Não foi possível carregar os dados do time. <button onClick={() => void load()}>Tentar novamente</button></div>}
        <div className="content-grid"><section className="roster-section" aria-labelledby="roster-title"><div className="section-heading"><div><span className="eyebrow">01 / LINEUP</span><h2 id="roster-title">Escalação do time</h2></div><span className="progress-text">{picked} de 5 definidos</span></div><div className="roster-list">{players.map((player, index) => {
          const agent = agentList.find((entry) => entry.id === current.picks[player]);
          return <div className="player-row" key={player}><span className="player-number">0{index + 1}</span><div className="player-avatar">{player.slice(0, 1).toUpperCase()}</div><div className="player-name"><strong>{player}</strong><small>JOGADOR</small></div><button className={`agent-choice ${agent ? "chosen" : ""}`} onClick={() => { setPickerFor(player); setQuery(""); }} aria-label={`Escolher agente para ${player}`} disabled={loadState !== "ready"}>{agent ? <><img src={agent.icon} alt="" /><span><strong>{agent.name}</strong><small>{agent.role}</small></span></> : <span className="empty-agent"><Sparkles size={16} /> Escolher agente</span>}<ChevronDown size={16} className="choice-chevron" /></button></div>;
        })}</div></section>
        <section className="notes-section" aria-labelledby="notes-title"><div className="section-heading"><div><span className="eyebrow">02 / ESTRATÉGIA</span><h2 id="notes-title">Observações</h2></div><span className="notes-icon">✳</span></div><p className="notes-help">Anote combinações, posições, execuções e lembretes para este mapa.</p><Textarea aria-label={`Observações para ${mapNames[selectedMap]}`} placeholder="Ex.: João entra primeiro no bomb A; guardar utilidade para o pós-plant..." value={current.notes} onChange={(event) => updateCurrent({ notes: event.target.value })} disabled={loadState !== "ready"} maxLength={5000} className="notes-input" /><div className="notes-bottom"><span>{current.notes.length}/5000 caracteres</span><button onClick={() => void load()} title="Atualizar dados do time" aria-label="Atualizar dados do time"><RefreshCw size={16} /> Atualizar</button></div></section></div>
      </main>
    </div>
    <Dialog open={pickerFor !== null} onOpenChange={(open) => { if (!open) setPickerFor(null); }}><DialogContent className="agent-dialog"><DialogHeader><span className="eyebrow">SELEÇÃO DE AGENTE</span><DialogTitle>Quem {pickerFor} vai jogar?</DialogTitle></DialogHeader><label className="agent-search"><Search size={18} /><input autoFocus placeholder="Buscar agente ou função..." value={query} onChange={(event) => setQuery(event.target.value)} /></label><div className="agent-grid">{filteredAgents.map((agent) => {
      const inUse = players.find((player) => player !== pickerFor && current.picks[player] === agent.id);
      return <button key={agent.id} onClick={() => chooseAgent(agent.id)} disabled={Boolean(inUse)} className="agent-option"><img src={agent.icon} alt="" /><strong>{agent.name}</strong><small>{inUse ? `Com ${inUse}` : agent.role}</small>{current.picks[pickerFor ?? ""] === agent.id && <Check size={15} className="selected-check" />}</button>;
    })}</div>{filteredAgents.length === 0 && <p className="no-results">Nenhum agente encontrado.</p>}{current.picks[pickerFor ?? ""] && <button className="clear-pick" onClick={() => { if (pickerFor) { const picks = { ...current.picks }; delete picks[pickerFor]; updateCurrent({ picks }); setPickerFor(null); } }}>Remover agente deste jogador</button>}</DialogContent></Dialog>
  </div>;
}


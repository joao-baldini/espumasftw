"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, Maximize2, Minimize2, MousePointer2, MoveUpRight, Pencil, Redo2, RotateCw, Scan, Tags, Trash2, Type, Undo2, ZoomIn, ZoomOut } from "lucide-react";
import agents from "../agents.json";
import { abilitiesForAgent, abilityByKey, isDirectional, slotLabels } from "@/lib/tactics/abilities";
import { boardSize, commit, emptyHistory, mapInfo, moveItem, newId, redo, undo, type BoardItem, type History, type Team } from "@/lib/tactics/board";
import { sitesForMap, type Notes, type NoteKey } from "@/lib/composition";
import { BoardItemView, teamColors } from "./board-items";

type Agent = { id: string; name: string; role: string; icon: string };
type Tool = "select" | "pen" | "arrow" | "text" | "eraser";
type Placing = { kind: "agent"; agentId: string; team: Team } | { kind: "ability"; abilityKey: string; team: Team };
type Drag =
  | { type: "pan"; clientX: number; clientY: number; view: View }
  | { type: "move"; id: string; x: number; y: number; before: BoardItem[]; moved: boolean }
  | { type: "rotate"; id: string; before: BoardItem[] }
  | { type: "draw"; id: string; before: BoardItem[] };
type View = { x: number; y: number; size: number };

const agentList = agents as Agent[];
const agentById = new Map(agentList.map((agent) => [agent.id, agent]));
const colors = ["#ffffff", "#ffe066", "#3fd6b0", "#ff4f64", "#5fd3ff"];
const fullView: View = { x: 0, y: 0, size: boardSize };
const tools: Array<{ id: Tool; label: string; icon: typeof Pencil }> = [
  { id: "select", label: "Selecionar e mover", icon: MousePointer2 },
  { id: "pen", label: "Desenhar", icon: Pencil },
  { id: "arrow", label: "Seta", icon: MoveUpRight },
  { id: "text", label: "Texto", icon: Type },
  { id: "eraser", label: "Apagar", icon: Eraser },
];

function clampView(next: View): View {
  const margin = next.size * 0.4;
  return { size: next.size, x: Math.min(boardSize - next.size + margin, Math.max(-margin, next.x)), y: Math.min(boardSize - next.size + margin, Math.max(-margin, next.y)) };
}

// Zooms keeping the point at fraction (fx, fy) of the viewport fixed on screen.
function zoomView(current: View, factor: number, fx = 0.5, fy = 0.5): View {
  const size = Math.min(boardSize, Math.max(boardSize / 8, current.size * factor));
  return clampView({ x: current.x + (current.size - size) * fx, y: current.y + (current.size - size) * fy, size });
}

function phasesForMap(map: string) {
  const sites = sitesForMap(map);
  return [
    { id: "default", label: "Default" },
    ...sites.map((site) => ({ id: `exec${site}`, label: `Exec ${site}` })),
    ...sites.map((site) => ({ id: `postPlant${site}`, label: `Pós Plant ${site}` })),
    ...sites.map((site) => ({ id: `retake${site}`, label: `Retake ${site}` })),
  ];
}

export function TacticsBoard({ map, mapName, allies, notes, observations, onNoteChange, editable }: { map: string; mapName: string; allies: Array<{ player: string; agentId: string }>; notes: Notes; observations: string; onNoteChange: (key: NoteKey, value: string) => void; editable: boolean }) {
  const [boards, setBoards] = useState<Record<string, History>>({});
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const dirty = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const revisions = useRef(new Map<string, number>());
  const queues = useRef(new Map<string, Promise<void>>());
  const [phase, setPhase] = useState("default");
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(colors[0]);
  const [placing, setPlacing] = useState<Placing | null>(null);
  const [focusAgent, setFocusAgent] = useState<{ agentId: string; team: Team } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<View>(fullView);
  const [rotated, setRotated] = useState(false);
  const [showCallouts, setShowCallouts] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [textDraft, setTextDraft] = useState<{ x: number; y: number; left: number; top: number; value: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const contentRef = useRef<SVGGElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const boardKey = `${map}:${phase}`;
  const history = boards[boardKey] ?? emptyHistory();
  const items = history.present;
  const { meter, callouts } = mapInfo(map);
  const viewRotation = rotated ? 180 : 0;
  const phases = phasesForMap(map);
  const selected = items.find((item) => item.id === selectedId);
  const phaseNotes = phase.startsWith("exec")
    ? [{ key: "exec" as NoteKey, label: "Exec geral", value: notes.exec ?? "" }, { key: phase as NoteKey, label: `Exec · Bomb ${phase.at(-1)}`, value: notes[phase as NoteKey] ?? "" }]
    : [{ key: phase as NoteKey, label: phases.find((entry) => entry.id === phase)?.label ?? "Default", value: notes[phase as NoteKey] ?? "" }];

  async function loadBoards() {
    setLoadState("loading");
    try {
      const response = await fetch("/api/tactics", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const data = await response.json() as Record<string, { items: BoardItem[] }>;
      setBoards(Object.fromEntries(Object.entries(data).map(([key, value]) => [key, { past: [], present: value.items, future: [] }])));
      setLoadState("ready");
      setSaveState("saved");
    } catch { setLoadState("error"); }
  }

  useEffect(() => { void loadBoards(); }, []);

  function saveBoard(key: string, boardItems: BoardItem[], revision: number) {
    const previous = queues.current.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const [boardMap, boardPhase] = key.split(":");
      const response = await fetch(`/api/tactics/${boardMap}/${boardPhase}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: boardItems }) });
      if (!response.ok) throw new Error();
      if (revisions.current.get(key) === revision) setSaveState("saved");
    }).catch(() => { if (revisions.current.get(key) === revision) setSaveState("error"); });
    queues.current.set(key, next);
  }

  useEffect(() => {
    for (const key of dirty.current) {
      const boardItems = boards[key]?.present;
      if (!boardItems) continue;
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      const revision = (revisions.current.get(key) ?? 0) + 1;
      revisions.current.set(key, revision);
      timers.current.set(key, setTimeout(() => { timers.current.delete(key); saveBoard(key, boardItems, revision); }, 700));
    }
    dirty.current.clear();
  }, [boards]);

  const [lastMap, setLastMap] = useState(map);
  if (lastMap !== map) { setLastMap(map); setPhase("default"); setSelectedId(null); setView(fullView); setTextDraft(null); }

  function setHistory(update: (history: History) => History) {
    if (loadState !== "ready") return;
    dirty.current.add(boardKey);
    setSaveState("saving");
    setBoards((previous) => ({ ...previous, [boardKey]: update(previous[boardKey] ?? emptyHistory()) }));
  }
  function setItems(update: (items: BoardItem[]) => BoardItem[]) { setHistory((current) => ({ ...current, present: update(current.present) })); }
  function commitItems(next: BoardItem[]) { setHistory((current) => commit(current, next)); }
  // Drags edit the present in place; on release the pre-drag state becomes one undo step.
  function commitDrag(before: BoardItem[]) { setHistory((current) => commit({ ...current, present: before }, current.present)); }
  function removeItem(id: string) {
    commitItems(items.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function toBoard(event: { clientX: number; clientY: number }) {
    const matrix = contentRef.current?.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: point.x, y: point.y };
  }

  function zoom(factor: number) {
    setView((current) => zoomView(current, factor));
  }

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      setView((current) => zoomView(current, event.deltaY > 0 ? 1.15 : 1 / 1.15, (event.clientX - rect.left) / rect.width, (event.clientY - rect.top) / rect.height));
    };
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable]")) return;
      if (!canvasRef.current?.closest(".tactics-section")?.matches(":hover") && !fullscreen) return;
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") { event.preventDefault(); setHistory(event.shiftKey ? redo : undo); }
      else if (mod && event.key.toLowerCase() === "y") { event.preventDefault(); setHistory(redo); }
      else if ((event.key === "Delete" || event.key === "Backspace") && selectedId) { event.preventDefault(); removeItem(selectedId); }
      else if (event.key === "Escape") { setPlacing(null); setSelectedId(null); if (fullscreen) setFullscreen(false); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function onPointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    if (loadState !== "ready") return;
    if (event.button !== 0 && event.button !== 1) return;
    if (textDraft) { finishText(); return; }
    const point = toBoard(event);
    const target = event.target as Element;
    const itemId = target.closest("[data-id]")?.getAttribute("data-id") ?? null;
    if (tool !== "eraser" || placing) event.currentTarget.setPointerCapture(event.pointerId);

    if (event.button === 1) { drag.current = { type: "pan", clientX: event.clientX, clientY: event.clientY, view }; return; }
    if (placing) {
      const id = newId();
      const item: BoardItem = placing.kind === "agent"
        ? { kind: "agent", id, agentId: placing.agentId, team: placing.team, x: point.x, y: point.y }
        : { kind: "ability", id, abilityKey: placing.abilityKey, team: placing.team, x: point.x, y: point.y, rotation: placing.team === "enemy" ? 90 : -90 };
      setItems((current) => [...current, item]);
      setSelectedId(id);
      if (!event.shiftKey) setPlacing(null);
      drag.current = { type: "move", id, x: point.x, y: point.y, before: items, moved: true };
      return;
    }
    if (tool === "eraser") { if (itemId) removeItem(itemId); return; }
    if (tool === "pen" || tool === "arrow") {
      const id = newId();
      const item: BoardItem = tool === "pen" ? { kind: "stroke", id, points: [point.x, point.y], color } : { kind: "arrow", id, x: point.x, y: point.y, x2: point.x, y2: point.y, color };
      drag.current = { type: "draw", id, before: items };
      setItems((current) => [...current, item]);
      return;
    }
    if (tool === "text") {
      const rect = canvasRef.current!.getBoundingClientRect();
      setTextDraft({ ...point, left: event.clientX - rect.left, top: event.clientY - rect.top, value: "" });
      return;
    }
    if (target.closest("[data-handle]") && selectedId) { drag.current = { type: "rotate", id: selectedId, before: items }; return; }
    setSelectedId(itemId);
    drag.current = itemId ? { type: "move", id: itemId, x: point.x, y: point.y, before: items, moved: false } : { type: "pan", clientX: event.clientX, clientY: event.clientY, view };
  }

  function onPointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const current = drag.current;
    if (!current) {
      if (tool === "eraser" && event.buttons === 1) {
        const id = document.elementFromPoint(event.clientX, event.clientY)?.closest("[data-id]")?.getAttribute("data-id");
        if (id) removeItem(id);
      }
      return;
    }
    if (current.type === "pan") {
      const rect = svgRef.current!.getBoundingClientRect();
      const scale = current.view.size / rect.width;
      setView(clampView({ ...current.view, x: current.view.x - (event.clientX - current.clientX) * scale, y: current.view.y - (event.clientY - current.clientY) * scale }));
      return;
    }
    const point = toBoard(event);
    if (current.type === "move") {
      const [dx, dy] = [point.x - current.x, point.y - current.y];
      drag.current = { ...current, x: point.x, y: point.y, moved: true };
      setItems((list) => list.map((item) => item.id === current.id ? moveItem(item, dx, dy) : item));
    } else if (current.type === "rotate") {
      setItems((list) => list.map((item) => item.id === current.id && item.kind === "ability" ? { ...item, rotation: Math.atan2(point.y - item.y, point.x - item.x) * 180 / Math.PI } : item));
    } else {
      setItems((list) => list.map((item) => {
        if (item.id !== current.id) return item;
        if (item.kind === "arrow") return { ...item, x2: point.x, y2: point.y };
        if (item.kind !== "stroke") return item;
        const [lx, ly] = item.points.slice(-2);
        return Math.hypot(point.x - lx, point.y - ly) < 3 ? item : { ...item, points: [...item.points, Math.round(point.x), Math.round(point.y)] };
      }));
    }
  }

  function onPointerUp() {
    const current = drag.current;
    drag.current = null;
    if (!current || current.type === "pan") return;
    if (current.type === "move" && !current.moved) return;
    if (current.type === "draw") {
      const item = items.find((entry) => entry.id === current.id);
      const tooSmall = item?.kind === "stroke" ? item.points.length < 4 : item?.kind === "arrow" && Math.hypot(item.x2 - item.x, item.y2 - item.y) < 10;
      if (tooSmall) { setItems(() => current.before); return; }
    }
    commitDrag(current.before);
  }

  function finishText() {
    if (!textDraft) return;
    const text = textDraft.value.trim();
    if (text) commitItems([...items, { kind: "text", id: newId(), x: textDraft.x, y: textDraft.y, text: text.slice(0, 60), color }]);
    setTextDraft(null);
  }

  function chooseAgent(agentId: string, team: Team) {
    setFocusAgent({ agentId, team });
    setPlacing({ kind: "agent", agentId, team });
    setTool("select");
  }
  function chooseTool(next: Tool) { setTool(next); setPlacing(null); if (next !== "select") setSelectedId(null); }
  function clearBoard() { if (items.length) { commitItems([]); setSelectedId(null); } }

  const focusAbilities = focusAgent ? abilitiesForAgent(focusAgent.agentId) : [];
  const hint = placing ? `Clique no mapa para posicionar ${placing.kind === "agent" ? agentById.get(placing.agentId)?.name : abilityByKey.get(placing.abilityKey)?.name}. Shift mantém a seleção.`
    : selected?.kind === "ability" && isDirectional(abilityByKey.get(selected.abilityKey)!.spec) ? "Arraste o ponto rosa para girar a habilidade. Delete remove."
    : tool === "select" ? "Arraste para mover o mapa, roda do mouse para zoom." : tool === "text" ? "Clique no mapa para escrever." : tool === "eraser" ? "Clique ou arraste sobre um item para apagar." : "Clique e arraste para desenhar.";

  return <section className={`tactics-section ${fullscreen ? "fullscreen" : ""}`} aria-labelledby="tactics-title">
    <div className="section-heading"><div><span className="eyebrow">03 / QUADRO TÁTICO</span><h2 id="tactics-title">Quadro tático · {mapName}</h2></div><span className="tactics-note" role="status">{loadState === "loading" ? "Carregando quadro" : loadState === "error" ? "Erro ao carregar" : saveState === "saving" ? "Salvando quadro" : saveState === "error" ? "Erro ao salvar" : "Quadro salvo"}</span></div>
    {loadState === "error" && <div className="error-banner">Não foi possível carregar o quadro tático. <button onClick={() => void loadBoards()}>Tentar novamente</button></div>}
    {saveState === "error" && <div className="error-banner">Não foi possível salvar esta alteração. <button onClick={() => { setSaveState("saving"); const revision = (revisions.current.get(boardKey) ?? 0) + 1; revisions.current.set(boardKey, revision); saveBoard(boardKey, items, revision); }}>Tentar novamente</button></div>}
    <div className="tactics-phases" role="tablist" aria-label="Fase do quadro">{phases.map((entry) => <button key={entry.id} role="tab" aria-selected={phase === entry.id} className={phase === entry.id ? "active" : ""} onClick={() => { setPhase(entry.id); setSelectedId(null); }}>{entry.label}{(boards[`${map}:${entry.id}`]?.present.length ?? 0) > 0 && <span className="phase-dot" />}</button>)}</div>
    <div className="tactics-layout">
      <div className="tactics-stage">
        <div className="tactics-procedure" aria-label="Observações da fase"><strong>Procedimentos · {phases.find((entry) => entry.id === phase)?.label}</strong>{phaseNotes.map((entry) => <div key={entry.key}><label htmlFor={`tactics-note-${entry.key}`}>{entry.label}</label><textarea id={`tactics-note-${entry.key}`} value={entry.value} onChange={(event) => onNoteChange(entry.key, event.target.value)} disabled={!editable} maxLength={5000} placeholder="Posições, habilidades e coordenação desta fase..." /><small>{entry.value.length}/5000 caracteres</small></div>)}{observations && <div><span>Observações do mapa</span><p>{observations}</p></div>}</div>
        <div className="tactics-toolbar" role="toolbar" aria-label="Ferramentas do quadro">
          <div className="tool-group">{tools.map(({ id, label, icon: Icon }) => <button key={id} className={tool === id && !placing ? "active" : ""} onClick={() => chooseTool(id)} title={label} aria-label={label} aria-pressed={tool === id}><Icon size={17} /></button>)}</div>
          <div className="tool-group">{colors.map((swatch) => <button key={swatch} className={`swatch ${color === swatch ? "active" : ""}`} style={{ background: swatch }} onClick={() => setColor(swatch)} title="Cor do desenho" aria-label={`Cor ${swatch}`} aria-pressed={color === swatch} />)}</div>
          <div className="tool-group">
            <button onClick={() => setHistory(undo)} disabled={!history.past.length} title="Desfazer (Ctrl+Z)" aria-label="Desfazer"><Undo2 size={17} /></button>
            <button onClick={() => setHistory(redo)} disabled={!history.future.length} title="Refazer (Ctrl+Shift+Z)" aria-label="Refazer"><Redo2 size={17} /></button>
            <button onClick={clearBoard} disabled={!items.length} title="Limpar fase" aria-label="Limpar fase"><Trash2 size={17} /></button>
          </div>
          <div className="tool-group">
            <button onClick={() => zoom(1 / 1.4)} title="Aproximar" aria-label="Aproximar"><ZoomIn size={17} /></button>
            <button onClick={() => zoom(1.4)} title="Afastar" aria-label="Afastar"><ZoomOut size={17} /></button>
            <button onClick={() => setView(fullView)} title="Enquadrar mapa" aria-label="Enquadrar mapa"><Scan size={17} /></button>
            <button className={rotated ? "active" : ""} onClick={() => setRotated(!rotated)} title="Girar mapa 180°" aria-label="Girar mapa" aria-pressed={rotated}><RotateCw size={17} /></button>
            <button className={showCallouts ? "active" : ""} onClick={() => setShowCallouts(!showCallouts)} title="Nomes das posições" aria-label="Nomes das posições" aria-pressed={showCallouts}><Tags size={17} /></button>
            <button onClick={() => setFullscreen(!fullscreen)} title={fullscreen ? "Sair da tela cheia" : "Tela cheia"} aria-label={fullscreen ? "Sair da tela cheia" : "Tela cheia"}>{fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}</button>
          </div>
        </div>
        <div className={`tactics-canvas tool-${placing ? "place" : tool}`} ref={canvasRef}>
          <svg ref={svgRef} viewBox={`${view.x} ${view.y} ${view.size} ${view.size}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onContextMenu={(event) => event.preventDefault()} role="img" aria-label={`Minimapa de ${mapName} com ${items.length} itens`}>
            <g ref={contentRef} transform={rotated ? `rotate(180 ${boardSize / 2} ${boardSize / 2})` : undefined}>
              <image href={`/minimaps/${map}.png`} x={0} y={0} width={boardSize} height={boardSize} />
              {showCallouts && callouts.map((callout, index) => <text key={index} className="callout" transform={`translate(${callout.x} ${callout.y}) rotate(${-viewRotation})`} textAnchor="middle" dominantBaseline="middle">{callout.name}</text>)}
              {items.map((item) => <BoardItemView key={item.id} item={item} meter={meter} selected={item.id === selectedId} viewRotation={viewRotation} />)}
            </g>
          </svg>
          {textDraft && <input className="tactics-text-input" style={{ left: textDraft.left, top: textDraft.top }} autoFocus maxLength={60} value={textDraft.value} placeholder="Texto e Enter" onChange={(event) => setTextDraft({ ...textDraft, value: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") finishText(); if (event.key === "Escape") setTextDraft(null); }} onBlur={finishText} />}
          <span className="tactics-hint">{hint}</span>
        </div>
      </div>
      <aside className="tactics-palette" aria-label="Agentes e habilidades">
        <div className="palette-block">
          <span className="palette-title"><span className="team-swatch" style={{ background: teamColors.ally }} /> SEU TIME</span>
          {allies.length ? <div className="palette-allies">{allies.map(({ player, agentId }) => {
            const agent = agentById.get(agentId);
            if (!agent) return null;
            return <button key={player} className={focusAgent?.agentId === agentId && focusAgent.team === "ally" ? "active" : ""} onClick={() => chooseAgent(agentId, "ally")} title={`Posicionar ${agent.name} (${player})`}><img src={agent.icon} alt="" /><span><strong>{agent.name}</strong><small>{player}</small></span></button>;
          })}</div> : <p className="palette-empty">Defina a escalação acima para usar os agentes do time.</p>}
        </div>
        <div className="palette-block">
          <span className="palette-title"><span className="team-swatch" style={{ background: teamColors.enemy }} /> ADVERSÁRIOS</span>
          <div className="palette-enemies">{agentList.map((agent) => <button key={agent.id} className={focusAgent?.agentId === agent.id && focusAgent.team === "enemy" ? "active" : ""} onClick={() => chooseAgent(agent.id, "enemy")} title={`Posicionar ${agent.name} adversário`} aria-label={`${agent.name} adversário`}><img src={agent.icon} alt="" /></button>)}</div>
        </div>
        <div className="palette-block">
          <span className="palette-title">HABILIDADES{focusAgent && ` · ${agentById.get(focusAgent.agentId)?.name}`}</span>
          {focusAgent ? <div className="palette-abilities">{focusAbilities.map((ability) => <button key={ability.key} className={placing?.kind === "ability" && placing.abilityKey === ability.key ? "active" : ""} onClick={() => { setPlacing({ kind: "ability", abilityKey: ability.key, team: focusAgent.team }); setTool("select"); }} title={ability.name}><img src={ability.icon} alt="" /><span><kbd>{slotLabels[ability.slot]}</kbd>{ability.name}</span></button>)}</div> : <p className="palette-empty">Escolha um agente para ver as habilidades.</p>}
        </div>
      </aside>
    </div>
  </section>;
}

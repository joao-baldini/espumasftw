"use client";

import { useEffect, useRef, useState } from "react";

type TrainingDraft = { wins: string; losses: string };
type SaveState = "saved" | "saving" | "error";

const emptyDraft = (): TrainingDraft => ({ wins: "0", losses: "0" });

export function TrainingResults({ map, mapName }: { map: string; mapName: string }) {
  const [drafts, setDrafts] = useState<Record<string, TrainingDraft>>({});
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({});
  const draftsRef = useRef<Record<string, TrainingDraft>>({});
  const pending = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const current = drafts[map] ?? emptyDraft();
  const wins = Number(current.wins) || 0;
  const losses = Number(current.losses) || 0;
  const total = wins + losses;

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/training-results", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const results = await response.json() as Record<string, { wins: number; losses: number }>;
        const next = Object.fromEntries(Object.entries(results).map(([key, value]) => [key, { wins: String(value.wins), losses: String(value.losses) }]));
        draftsRef.current = next;
        setDrafts(next);
        setLoadState("ready");
      } catch { setLoadState("error"); }
    }
    void load();
  }, []);

  async function save(targetMap: string, draft: TrainingDraft) {
    setSaveStates((previous) => ({ ...previous, [targetMap]: "saving" }));
    try {
      const response = await fetch(`/api/training-results/${targetMap}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wins: Number(draft.wins) || 0, losses: Number(draft.losses) || 0 }),
      });
      if (!response.ok) throw new Error();
      setSaveStates((previous) => ({ ...previous, [targetMap]: "saved" }));
    } catch { setSaveStates((previous) => ({ ...previous, [targetMap]: "error" })); }
  }

  function flush(targetMap: string) {
    const timer = pending.current.get(targetMap);
    if (!timer) return;
    clearTimeout(timer);
    pending.current.delete(targetMap);
    const draft = draftsRef.current[targetMap];
    const normalized = { wins: draft.wins || "0", losses: draft.losses || "0" };
    draftsRef.current = { ...draftsRef.current, [targetMap]: normalized };
    setDrafts(draftsRef.current);
    void save(targetMap, normalized);
  }

  function update(field: keyof TrainingDraft, value: string) {
    if (!/^\d{0,5}$/.test(value)) return;
    const next = { ...(draftsRef.current[map] ?? emptyDraft()), [field]: value };
    draftsRef.current = { ...draftsRef.current, [map]: next };
    setDrafts(draftsRef.current);
    const timer = pending.current.get(map);
    if (timer) clearTimeout(timer);
    pending.current.set(map, setTimeout(() => flush(map), 700));
    setSaveStates((previous) => ({ ...previous, [map]: "saving" }));
  }

  return <section className="training-section" aria-labelledby="training-title">
    <div className="training-intro"><span className="eyebrow">TREINOS / {mapName.toUpperCase()}</span><h2 id="training-title">Vitórias e derrotas</h2><p>Registre o resultado dos treinos neste mapa.</p></div>
    <div className="training-fields">
      <label className="training-field"><span>Vitórias</span><input aria-label={`Vitórias em ${mapName}`} inputMode="numeric" pattern="[0-9]*" maxLength={5} value={current.wins} onChange={(event) => update("wins", event.target.value)} onBlur={() => flush(map)} disabled={loadState !== "ready"} /></label>
      <span className="training-separator">×</span>
      <label className="training-field"><span>Derrotas</span><input aria-label={`Derrotas em ${mapName}`} inputMode="numeric" pattern="[0-9]*" maxLength={5} value={current.losses} onChange={(event) => update("losses", event.target.value)} onBlur={() => flush(map)} disabled={loadState !== "ready"} /></label>
      <div className="training-summary"><strong>{total ? `${Math.round(wins / total * 100)}%` : "—"}</strong><span>APROVEITAMENTO</span></div>
    </div>
    <span className={`training-status ${loadState === "error" || saveStates[map] === "error" ? "error" : ""}`} role="status">{loadState === "loading" ? "Carregando" : loadState === "error" ? "Erro ao carregar" : saveStates[map] === "saving" ? "Salvando" : saveStates[map] === "error" ? "Erro ao salvar. Edite o valor para tentar novamente." : "Tudo salvo"}</span>
  </section>;
}

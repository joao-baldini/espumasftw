"use client";

import { useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { maxNoteLength } from "@/lib/composition";

type Status = "loading" | "ready" | "saving" | "saved" | "error";

export function TeamObservations() {
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueue = useRef(Promise.resolve());
  const revision = useRef(0);

  function load() {
    return fetch("/api/team-observations", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar as observações do time.");
        return response.json() as Promise<{ observations: string }>;
      })
      .then((result) => {
        setValue(result.observations);
        setLoaded(true);
        setStatus("ready");
        setError("");
      })
      .catch((cause) => {
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Não foi possível carregar as observações do time.");
      });
  }

  useEffect(() => {
    void load();
    return () => { if (pendingSave.current) clearTimeout(pendingSave.current); };
  }, []);

  function update(next: string) {
    setValue(next);
    setStatus("saving");
    setError("");
    const currentRevision = ++revision.current;
    if (pendingSave.current) clearTimeout(pendingSave.current);
    pendingSave.current = setTimeout(() => {
      saveQueue.current = saveQueue.current
        .catch(() => {})
        .then(async () => {
          const response = await fetch("/api/team-observations", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ observations: next }) });
          if (!response.ok) {
            const result = await response.json() as { error?: string };
            throw new Error(result.error ?? "Não foi possível salvar as observações do time.");
          }
          if (currentRevision === revision.current) setStatus("saved");
        })
        .catch((cause) => {
          if (currentRevision === revision.current) {
            setStatus("error");
            setError(cause instanceof Error ? cause.message : "Não foi possível salvar as observações do time.");
          }
        });
      pendingSave.current = null;
    }, 700);
  }

  return <section className="team-observations-section" aria-labelledby="team-observations-title">
    <div className="team-notes-header"><div><span className="eyebrow">TIME / GERAL</span><h2 id="team-observations-title">Observações Gerais do Time</h2></div><span className="team-notes-status" role="status">{status === "loading" ? "Carregando" : status === "saving" ? "Salvando" : status === "saved" || status === "ready" ? "Tudo salvo" : loaded ? "Erro ao salvar" : "Sem conexão"}</span></div>
    <p>Registre informações que valem para todos os mapas.</p>
    <Textarea id="team-observations" aria-label="Observações Gerais do Time" placeholder="Combinados, lembretes e prioridades do time..." value={value} onChange={(event) => update(event.target.value)} disabled={!loaded} maxLength={maxNoteLength} className="notes-input team-observations-input" />
    <div className="team-notes-bottom"><span>{error || "Salvamento automático"}</span><span>{value.length}/{maxNoteLength} caracteres</span></div>
    {status === "error" && !loaded && <button className="team-notes-retry" onClick={() => { setStatus("loading"); void load(); }}>Tentar novamente</button>}
  </section>;
}

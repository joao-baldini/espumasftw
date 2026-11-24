import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { RadiantEmblem } from "@/components/radiant-emblem";
import { INTERTWINED_RADIANT } from "@/lib/vlr/announcements";
import { matches } from "@/lib/vlr/matches";
import { playerMapRecords, registeredPlayers } from "@/lib/vlr/player-stats";
import { PLAYER_AVATARS } from "@/lib/vlr/players";
import { aggregateMapStats, formatMatchDate } from "@/lib/vlr/stats";
import vlr from "../../vlr.module.css";
import styles from "./tribute.module.css";

export const metadata: Metadata = {
  title: "intertwined é Radiante — VLR dos Espumas",
  description: "Homenagem ao intertwined, que chegou ao Radiante: os números dele com a camisa dos Espumas.",
};

const PLAYER_ID = INTERTWINED_RADIANT.playerId;
const decimal = (value: number, digits = 2) => value.toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Momentos tirados dos relatórios de scrim, ranqueadas e do FIAP NEXT VALORANT 2026.
const moments = [
  { date: "2026-10-18", title: "ACE na eliminação", text: "Contra Allan e amigos, no round 17 da Bind, abriu dois abates, ficou sozinho contra três e fechou um ACE. Terminou com 20/15 e 340 de ACS." },
  { date: "2026-10-17", title: "13 a 0 na Ascent", text: "Contra Os Maga las: 19 kills, 2 mortes, 382 de ACS e 5 primeiras eliminações sem nenhuma first death." },
  { date: "2026-10-14", title: "A partida histórica na Bind", text: "29/9, 406 de ACS, sequência de 8 kills, um 4k, um clutch 1v2 e dois 1v1. A defesa fechou 6 × 1 no segundo tempo." },
  { date: "2026-10-13", title: "Haven perfeita", text: "Sete primeiras eliminações e sete rounds ganhos. Nenhuma abertura dele foi desperdiçada no 13 × 5." },
  { date: "2026-10-13", title: "31 kills na Lotus", text: "31/8, 378 de ACS e 233,6 de ADR. Junto com vls, somou 53 das 92 kills do time na partida." },
  { date: "2026-10-07", title: "A estreia", text: "Entrou no time para o scrim contra os Esponjas e já terminou com o melhor K/D da equipe: 74/45 em três mapas, com 29 kills na Split." },
];

export default function IntertwinedRadiantPage() {
  const records = playerMapRecords(matches, PLAYER_ID);
  const totals = aggregateMapStats(records)!;
  const player = registeredPlayers(matches).find((entry) => entry.id === PLAYER_ID)!;
  const teammates = registeredPlayers(matches).filter((entry) => entry.teamId === "espumas");
  const team = teammates.map((entry) => ({ ...entry, totals: aggregateMapStats(playerMapRecords(matches, entry.id))! }));
  const wins = records.filter((record) => record.won).length;
  const agents = [...new Set(records.map((record) => record.stats.agent))];
  const firstMatch = [...records].sort((a, b) => a.date.localeCompare(b.date))[0];
  const topFragged = records.filter((record) => {
    const map = matches.find((match) => match.id === record.matchId)?.maps.find((entry) => entry.id === record.mapId && entry.stats.some((stats) => stats.playerId === PLAYER_ID));
    const espumas = map?.stats.filter((stats) => teammates.some((mate) => mate.id === stats.playerId)) ?? [];
    return espumas.every((stats) => stats.kills <= record.stats.kills);
  }).length;
  const teamKills = team.reduce((sum, entry) => sum + entry.totals.kills, 0);
  const teamFk = team.reduce((sum, entry) => sum + entry.totals.fk, 0);
  const best = [...records].sort((a, b) => b.stats.acs - a.stats.acs).slice(0, 4);

  const comparisons = [
    { label: "Rating*", value: (entry: typeof team[number]) => entry.totals.rating, format: (value: number) => decimal(value) },
    { label: "ACS", value: (entry: typeof team[number]) => entry.totals.acs, format: (value: number) => Math.round(value).toString() },
    { label: "K/D", value: (entry: typeof team[number]) => entry.totals.kd ?? 0, format: (value: number) => decimal(value) },
    { label: "ADR", value: (entry: typeof team[number]) => entry.totals.adr, format: (value: number) => Math.round(value).toString() },
  ].map((metric) => {
    const values = team.map((entry) => ({ id: entry.id, name: entry.name, value: metric.value(entry) })).sort((a, b) => b.value - a.value);
    return { ...metric, values, max: values[0].value };
  });

  return <div className={vlr.page}>
    <SiteHeader active="vlr" />
    <main className={`${vlr.container} ${styles.container}`}>
      <nav className={styles.breadcrumb} aria-label="Navegação"><Link href="/vlr-dos-espumas">VLR dos Espumas</Link><span>/</span><span>Homenagens</span></nav>

      <header className={styles.hero}>
        <div className={styles.rays} aria-hidden="true" />
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>ANÚNCIO · {formatMatchDate(INTERTWINED_RADIANT.announcedAt, true)}</span>
          <h1><span>{player.name}</span><strong>é Radiante.</strong></h1>
          <p>O topo do ranqueado do Valorant. O elo que poucos alcançam virou realidade para o nosso Chamber. Esta página é uma homenagem a quem sustentou a produção dos Espumas mapa após mapa, nas scrims, nas ranqueadas e no FIAP NEXT VALORANT 2026.</p>
          <span className={styles.riotId}>{player.riotId}</span>
        </div>
        <div className={styles.portrait}>
          <RadiantEmblem className={styles.emblem} />
          <Image src={PLAYER_AVATARS[PLAYER_ID]} alt={`Avatar de ${player.name}`} width={220} height={220} priority unoptimized />
        </div>
      </header>

      <dl className={styles.headline}>
        <div><dt>Rating Espumas*</dt><dd>{decimal(totals.rating)}</dd><small>Maior do time</small></div>
        <div><dt>Kills pelos Espumas</dt><dd>{totals.kills}</dd><small>{Math.round(totals.kills / teamKills * 100)}% das kills do time</small></div>
        <div><dt>K / D</dt><dd>{decimal(totals.kd ?? 0)}</dd><small>{totals.kills} / {totals.deaths} / {totals.assists}</small></div>
        <div><dt>ACS médio</dt><dd>{Math.round(totals.acs)}</dd><small>{decimal(totals.adr, 1)} de ADR</small></div>
        <div><dt>Primeiras kills</dt><dd>{totals.fk}<em>/</em>{totals.fd}</dd><small>{Math.round(totals.fk / teamFk * 100)}% das aberturas do time</small></div>
        <div><dt>Mapas</dt><dd>{wins}<em>V</em>{records.length - wins}<em>D</em></dd><small>Líder de kills em {topFragged} de {records.length}</small></div>
      </dl>

      <section aria-labelledby="journey-title" className={styles.journey}>
        <div className={styles.sectionTitle}><h2 id="journey-title">A trajetória com a camisa dos Espumas</h2><span>Desde {formatMatchDate(firstMatch.date, true)}</span></div>
        <p>intertwined chegou aos Espumas em outubro, num scrim contra os Esponjas, e saiu daquele dia com o melhor K/D do time. Nas semanas seguintes, nos relatórios, o nome dele virou sinônimo de referência: líder de kills em quase todos os mapas, a peça que abria os rounds e capitão inscrito no FIAP NEXT VALORANT 2026. Foram {records.length} mapas registrados e {totals.rounds} rounds, {agents.length === 1 ? `todos de ${agents[0]}` : `com ${agents.join(", ")}`}.</p>
        <p>Nas duas derrotas do campeonato foi o único Espumas com saldo positivo e rating acima de 1,00. Nas vitórias, foi a base de dano. O Radiante é o reflexo do que os números já mostravam aqui.</p>
      </section>

      <section aria-labelledby="compare-title">
        <div className={styles.sectionTitle}><h2 id="compare-title">Entre os Espumas</h2><span>Todas as partidas registradas · {totals.rounds} rounds</span></div>
        <div className={styles.compare}>{comparisons.map((metric) => <div key={metric.label} className={styles.metric}>
          <h3>{metric.label}</h3>
          <ol>{metric.values.map((entry) => <li key={entry.id} className={entry.id === PLAYER_ID ? styles.highlight : ""}>
            <span className={styles.name}>{entry.name}</span>
            <span className={styles.bar}><i style={{ width: `${Math.max(4, entry.value / metric.max * 100)}%` }} /></span>
            <span className={styles.value}>{metric.format(entry.value)}</span>
          </li>)}</ol>
        </div>)}</div>
      </section>

      <section aria-labelledby="best-title">
        <div className={styles.sectionTitle}><h2 id="best-title">As maiores atuações</h2><span>Por ACS</span></div>
        <div className={styles.best}>{best.map((record) => <Link key={`${record.matchId}-${record.mapId}`} href={`/vlr-dos-espumas/${record.matchId}`} className={styles.bestCard}>
          <div className={styles.bestMap}><Image src={`/maps/${record.mapId}.webp`} alt="" fill sizes="(max-width: 650px) 100vw, 260px" /><span>{record.mapName}</span></div>
          <div className={styles.bestBody}>
            <small>{formatMatchDate(record.date, true)} · vs {record.opponent}</small>
            <strong>{record.stats.acs} <em>ACS</em></strong>
            <span>{record.stats.kills} / {record.stats.deaths} / {record.stats.assists} · {record.stats.fk} FK</span>
            <b className={record.won ? vlr.positive : vlr.negative}>{record.won ? "Vitória" : "Derrota"} {record.score[0]}–{record.score[1]}</b>
          </div>
        </Link>)}</div>
      </section>

      <section aria-labelledby="moments-title">
        <div className={styles.sectionTitle}><h2 id="moments-title">Momentos para lembrar</h2><span>Dos relatórios de desempenho</span></div>
        <ol className={styles.moments}>{moments.map((moment) => <li key={moment.title}>
          <time dateTime={moment.date}>{formatMatchDate(moment.date, true)}</time>
          <div><h3>{moment.title}</h3><p>{moment.text}</p></div>
        </li>)}</ol>
      </section>

      <blockquote className={styles.closing}>
        <RadiantEmblem className={styles.closingEmblem} />
        <p>Parabéns, intertwined. O Radiante é seu, e um pouco de todos os Espumas também.</p>
        <cite>— Espumas</cite>
      </blockquote>

      <p className={styles.note}>* Rating Espumas v1, estimativa calibrada com o VLR 2.0; não é o rating oficial. Estatísticas calculadas a partir das partidas registradas no VLR dos Espumas, ponderadas pelos rounds.</p>
      <footer className={styles.footer}><Link href="/vlr-dos-espumas">← Todas as partidas</Link><Link href={`/vlr-dos-espumas/jogadores/${PLAYER_ID}`}>Perfil completo do intertwined →</Link></footer>
    </main>
  </div>;
}

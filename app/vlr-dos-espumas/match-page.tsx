import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { matches, formatMatchDate, seriesScore, totalRounds } from "@/lib/vlr/matches";
import type { ValorantMatch } from "@/lib/vlr/types";
import { MatchViewer } from "./match-viewer";
import styles from "./vlr.module.css";

export function MatchPage({ match }: { match: ValorantMatch }) {
  return <div className={styles.page}>
    <SiteHeader active="vlr" />
    <div className={styles.container}>
      <div className={styles.pageHeading}><div><h1>VLR dos Espumas</h1><p>Nosso histórico de partidas, mapa por mapa.</p></div><Link href="/" className={styles.backLink}>Voltar às composições</Link></div>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Histórico de partidas">
          <div className={styles.sideHeading}>Partidas <span>{matches.length}</span></div>
          <nav aria-label="Partidas registradas" className={styles.matchList}>{[...matches].sort((a, b) => b.date.localeCompare(a.date)).map((entry) => {
            const score = seriesScore(entry);
            return <Link key={entry.id} href={`/vlr-dos-espumas/${entry.id}`} className={entry.id === match.id ? styles.selectedMatch : ""} aria-current={entry.id === match.id ? "page" : undefined}>
              <time dateTime={entry.date}>{formatMatchDate(entry.date, true)}</time>
              {entry.teams.map((team, index) => <span className={styles.archiveTeam} key={team.id}><span className={`${styles.smallCrest} ${styles[team.crest]}`} aria-hidden="true" />{team.name}<b className={score[index] > score[1 - index] ? styles.positive : ""}>{score[index]}</b></span>)}
              <small>{entry.event}</small>
            </Link>;
          })}</nav>
          <div className={styles.sideHeading}>Esta série</div>
          <dl className={styles.seriesInfo}><div><dt>Mapas</dt><dd>{match.maps.length}</dd></div><div><dt>Rounds</dt><dd>{totalRounds(match)}</dd></div><div><dt>Formato</dt><dd>Personalizada</dd></div></dl>
        </aside>
        <main className={styles.main}><MatchViewer key={match.id} match={match} /></main>
      </div>
      <footer className={styles.footer}>VLR dos Espumas · Histórico do time. Layout inspirado no <a href="https://www.vlr.gg/" target="_blank" rel="noreferrer">VLR.gg</a>.</footer>
    </div>
  </div>;
}

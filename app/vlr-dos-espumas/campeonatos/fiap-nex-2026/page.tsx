import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { matches } from "@/lib/vlr/matches";
import { playerMapRecords, registeredPlayers } from "@/lib/vlr/player-stats";
import { PLAYER_AVATARS } from "@/lib/vlr/players";
import { aggregateMapStats, formatMatchDate } from "@/lib/vlr/stats";
import { FIAP_NEX_2026 } from "@/lib/vlr/tournaments";
import agents from "@/app/agents.json";
import vlr from "../../vlr.module.css";
import styles from "./tournament.module.css";

export const metadata: Metadata = { title: `${FIAP_NEX_2026.name} — VLR dos Espumas`, description: "A campanha dos Espumas no FIAP NEX 2026: três vitórias, duas derrotas, estatísticas individuais e replays das partidas." };

export default function TournamentPage() {
  const lastMatch = FIAP_NEX_2026.lastMatch;
  const games = matches.filter((match) => match.tournamentId === FIAP_NEX_2026.id)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.tournamentMatch?.order ?? 0) - (b.tournamentMatch?.order ?? 0));
  const maps = games.flatMap((match) => match.maps);
  const lastGame = games.find((match) => match.id === lastMatch.matchId)!;
  const lastMap = lastGame.maps[0];
  const wins = maps.filter((map) => map.score[0] > map.score[1]).length;
  const rounds = maps.reduce((sum, map) => sum + map.score[0] + map.score[1], 0);
  const roundWins = maps.reduce((sum, map) => sum + map.score[0], 0);
  const players = registeredPlayers(games).filter((player) => player.teamId === "espumas").map((player) => {
    const records = playerMapRecords(games, player.id);
    return { ...player, records, totals: aggregateMapStats(records)! };
  }).sort((a, b) => b.totals.rating - a.totals.rating);

  return <div className={vlr.page}>
    <SiteHeader active="vlr" />
    <main className={`${vlr.container} ${styles.container}`}>
      <nav className={styles.breadcrumb} aria-label="Navegação"><Link href="/vlr-dos-espumas">VLR dos Espumas</Link><span>/</span><span>Campeonatos</span></nav>
      <header className={styles.hero}>
        <div className={styles.heroTop}><span className={styles.eyebrow}>VALORANT · TEMPORADA 2026</span><span className={`${styles.status} ${styles.eliminated}`}><i />Participação encerrada</span></div>
        <h1>Campeonato VALORANT<br /><strong>FIAP NEX 2026</strong></h1>
        <p>Os Espumas encerraram sua campanha com {wins} vitórias e {maps.length - wins} derrotas, após o confronto com {lastGame.teams[1].name} na chave inferior.</p>
        <div className={styles.heroBottom}><span>{formatMatchDate(FIAP_NEX_2026.startedAt, true)} — {formatMatchDate(FIAP_NEX_2026.eliminatedAt, true)}</span><span>Stage 1 · Eliminados na Lower Round of 4</span></div>
      </header>
      <dl className={styles.summary}>
        <div><dt>Partidas registradas</dt><dd>{games.length}</dd></div>
        <div><dt>Vitórias / derrotas</dt><dd><span className={vlr.positive}>{wins} V</span><em>/</em><span className={vlr.negative}>{maps.length - wins} D</span></dd></div>
        <div><dt>Rounds ganhos / perdidos</dt><dd>{roundWins}<em>/</em>{rounds - roundWins}</dd></div>
        <div><dt>Aproveitamento</dt><dd>{maps.length ? Math.round(wins / maps.length * 100) : 0}<small>%</small></dd></div>
      </dl>
      <section aria-labelledby="matches-title">
        <div className={styles.sectionTitle}><h2 id="matches-title">Percurso dos Espumas</h2><span>Ordem cronológica · Stage 1</span></div>
        <div className={styles.games}>{games.map((match) => {
          const map = match.maps[0], won = map.score[0] > map.score[1];
          return <Link href={`/vlr-dos-espumas/${match.id}`} key={match.id} className={`${styles.game} ${won ? styles.win : styles.loss}`}>
            <div className={styles.map}><Image src={`/maps/${map.id}.webp`} alt="" fill sizes="(max-width: 600px) 90px, 140px" /><span>{map.name}</span></div>
            <div className={styles.gameBody}><div className={styles.gameMeta}><span>Jogo {match.tournamentMatch?.number} · {formatMatchDate(match.date, true)}</span><b>{won ? "Vitória" : "Derrota"}</b></div>
              <div className={styles.teams}><strong>Espumas</strong><span className={styles.score}>{map.score[0]}<em>:</em>{map.score[1]}</span><strong>{match.teams[1].name}</strong></div>
              <div className={styles.gameFooter}><span>{match.tournamentMatch?.stage}{map.score[0] + map.score[1] > 24 ? " · Prorrogação" : ""}</span><span>Estatísticas e replay →</span></div>
            </div>
          </Link>;
        })}</div>
        <aside className={styles.lastMatch} aria-labelledby="last-match-title">
          <div className={styles.lastMatchHeader}><span className={styles.status}>Último confronto · Derrota · MD{lastMatch.bestOf}</span><time dateTime={lastGame.date}>{formatMatchDate(lastGame.date, true)}<small>{lastMap.name} · {Math.floor(lastMap.durationSeconds / 60)}m {String(lastMap.durationSeconds % 60).padStart(2, "0")}s</small></time></div>
          <h3 id="last-match-title">Espumas <em>{lastMap.score[0]} : {lastMap.score[1]}</em> {lastGame.teams[1].name}</h3>
          <p>Jogo {lastMatch.number} · {lastMatch.stage}</p>
          <p>Eliminação dos Espumas na chave inferior.</p>
          <Link href={`/vlr-dos-espumas/${lastGame.id}`} className={styles.matchLink}>Ver estatísticas e replay da partida →</Link>
          <details className={styles.rosters}><summary>Jogadores inscritos</summary><p className={styles.rosterNote}>Lista de inscritos no campeonato. Os cinco jogadores que disputaram a partida estão no relatório do confronto.</p><div className={styles.rosterGrid}>{lastMatch.rosters.map((roster) => <section key={roster.team} aria-label={`Inscritos de ${roster.team}`}><h4>{roster.team}</h4><ul>{roster.players.map((player) => <li key={player.name}><span>{player.name}</span>{player.captain && <small>Capitão</small>}</li>)}</ul></section>)}</div></details>
        </aside>
      </section>
      <section aria-labelledby="stats-title">
        <div className={styles.sectionTitle}><h2 id="stats-title">Espumas no campeonato</h2><span>{maps.length} mapas · {rounds} rounds</span></div>
        <div className={styles.tableScroll}><table className={styles.stats}>
          <caption>Estatísticas individuais nas partidas registradas do FIAP NEX 2026</caption>
          <thead><tr><th scope="col">Jogador</th><th scope="col">Agentes</th><th scope="col" title="Rating Espumas v1">R*</th><th scope="col">ACS</th><th scope="col">K / D / A</th><th scope="col">+/−</th><th scope="col">KAST</th><th scope="col">ADR</th><th scope="col">FK / FD</th></tr></thead>
          <tbody>{players.map((player) => <tr key={player.id}>
            <th scope="row"><Link href={`/vlr-dos-espumas/jogadores/${player.id}`}><Image src={PLAYER_AVATARS[player.id]} alt="" width={30} height={33} unoptimized />{player.name}</Link></th>
            <td><div className={styles.agents}>{[...new Set(player.records.map((record) => record.stats.agent))].map((name) => { const agent = agents.find((entry) => entry.name === name); return agent && <Image key={name} src={agent.icon} alt={name} title={name} width={22} height={25} />; })}</div></td>
            <td className={styles.rating}>{player.totals.rating.toFixed(2)}</td><td>{Math.round(player.totals.acs)}</td><td>{player.totals.kills} / {player.totals.deaths} / {player.totals.assists}</td><td className={player.totals.kills >= player.totals.deaths ? vlr.positive : vlr.negative}>{player.totals.kills - player.totals.deaths}</td><td>{Math.round(player.totals.kast)}%</td><td>{Math.round(player.totals.adr)}</td><td>{player.totals.fk} / {player.totals.fd}</td>
          </tr>)}</tbody>
        </table></div>
        <p className={styles.note}>* Rating Espumas v1, estimativa calibrada com o VLR 2.0. Não é o rating oficial. Médias ponderadas pelos rounds. Os jogos também entram nas estatísticas gerais de cada jogador.</p>
      </section>
      <footer className={styles.footer}><Link href="/vlr-dos-espumas">← Todas as partidas</Link><Link href="/vlr-dos-espumas/jogadores">Perfis dos jogadores →</Link></footer>
    </main>
  </div>;
}

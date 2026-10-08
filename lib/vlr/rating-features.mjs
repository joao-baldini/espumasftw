/**
 * Observable proxies for VLR 2.0, never reconstructed round events.
 * Residual damage is a linear change of basis; all weights are fitted together.
 * 120 is a reference damage-per-kill, not VLR's undisclosed ADRa constant.
 * Combat residual isolates ACS not already represented by ADR / KPR / APR.
 * KAST is considered only as a candidate proxy, not a survival bonus.
 *
 * @param {{ rounds: number, kills: number, deaths: number, assists: number, adr: number, fk: number, fd: number, kast: number, acs: number }} stats
 */
export function ratingFeatures(stats) {
  if (!Number.isInteger(stats.rounds) || stats.rounds <= 0) throw new RangeError("Rating requires a positive integer round count");
  for (const key of ["kills", "deaths", "assists", "adr", "fk", "fd", "kast", "acs"]) {
    if (!Number.isFinite(stats[key]) || stats[key] < 0) throw new RangeError(`Invalid rating statistic: ${key}`);
  }
  if (stats.kast > 100 || stats.fk > stats.kills || stats.fd > stats.deaths) throw new RangeError("Inconsistent rating statistics");
  const kpr = stats.kills / stats.rounds;
  const apr = stats.assists / stats.rounds;
  return {
    kpr,
    dpr: stats.deaths / stats.rounds,
    apr,
    damageResidual: (stats.adr - 120 * kpr) / 100,
    fkpr: stats.fk / stats.rounds,
    fdpr: stats.fd / stats.rounds,
    kast: stats.kast / 100,
    combatResidual: (stats.acs - stats.adr - 150 * kpr - 25 * apr) / 100,
  };
}

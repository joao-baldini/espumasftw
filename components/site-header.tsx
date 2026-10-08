import Link from "next/link";

export function SiteHeader({ active = "compositions" }: { active?: "compositions" | "vlr" }) {
  return <header className="topbar">
    <Link className="brand" href="/" aria-label="Espumas, início"><span className="brand-mark">E</span><div><strong>ESPUMAS</strong><small>VALORANT</small></div></Link>
    <nav className="site-nav" aria-label="Navegação do site">
      <Link href="/" aria-current={active === "compositions" ? "page" : undefined}>Composições</Link>
      <Link href="/vlr-dos-espumas" aria-current={active === "vlr" ? "page" : undefined}>VLR dos Espumas</Link>
    </nav>
    <div className="topbar-right"><span className="team-chip"><span className="team-dot" /> CAMPEONATO</span><span className="edition">TEMPORADA 2026</span></div>
  </header>;
}

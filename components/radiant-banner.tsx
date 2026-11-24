import Link from "next/link";
import { INTERTWINED_RADIANT } from "@/lib/vlr/announcements";
import { RadiantEmblem } from "./radiant-emblem";
import styles from "./radiant-banner.module.css";

export function RadiantBanner({ className }: { className?: string }) {
  return <Link href={INTERTWINED_RADIANT.href} className={`${styles.banner} ${className ?? ""}`}>
    <RadiantEmblem className={styles.emblem} />
    <span className={styles.text}><small>ANÚNCIO · ELO MÁXIMO</small><strong>intertwined chegou ao Radiante. Uma homenagem aos números dele pelos Espumas.</strong></span>
    <span className={styles.cta}>Ler a homenagem →</span>
  </Link>;
}

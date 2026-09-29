import abilityAssets from "./abilities.json";

export type Effect = "smoke" | "damage" | "flash" | "slow" | "info" | "wall" | "heal" | "utility";
// Sizes are in in-game meters. Directional shapes start at the item position and point along its rotation.
export type Shape =
  | { type: "icon" }
  | { type: "circle"; radius: number }
  | { type: "cone"; length: number; angle: number }
  | { type: "line"; length: number; width: number }
  | { type: "wall"; length: number; width: number }
  | { type: "lane"; length: number; gap: number }
  | { type: "cross"; length: number };
export type AbilitySpec = Shape & { effect: Effect };
export type Ability = { key: string; agentId: string; slot: string; name: string; icon: string; spec: AbilitySpec };

const icon = (effect: Effect = "utility"): AbilitySpec => ({ type: "icon", effect });
const circle = (radius: number, effect: Effect): AbilitySpec => ({ type: "circle", radius, effect });
const cone = (length: number, angle: number, effect: Effect): AbilitySpec => ({ type: "cone", length, angle, effect });
const line = (length: number, width: number, effect: Effect): AbilitySpec => ({ type: "line", length, width, effect });
const wall = (length: number, width = 1): AbilitySpec => ({ type: "wall", length, width, effect: "wall" });

// Approximate values from community references. Riot changes them in patches; review when balance changes land.
const specs: Record<string, AbilitySpec> = {
  "Astra:Grenade": circle(4.75, "slow"), "Astra:Ability1": circle(4.75, "flash"), "Astra:Ability2": circle(4.75, "smoke"), "Astra:Ultimate": wall(120, 1.5),
  "Breach:Grenade": line(4, 3, "damage"), "Breach:Ability1": icon("flash"), "Breach:Ability2": line(45, 6, "flash"), "Breach:Ultimate": cone(32, 60, "flash"),
  "Brimstone:Grenade": circle(6, "heal"), "Brimstone:Ability1": circle(4.5, "damage"), "Brimstone:Ability2": circle(4.15, "smoke"), "Brimstone:Ultimate": circle(9, "damage"),
  "Chamber:Grenade": circle(7.5, "slow"), "Chamber:Ability1": icon(), "Chamber:Ability2": circle(13, "utility"), "Chamber:Ultimate": circle(7, "slow"),
  "Clove:Grenade": icon("heal"), "Clove:Ability1": circle(5.5, "damage"), "Clove:Ability2": circle(4.15, "smoke"), "Clove:Ultimate": icon("heal"),
  "Cypher:Grenade": line(15, 0.6, "slow"), "Cypher:Ability1": circle(3.7, "smoke"), "Cypher:Ability2": icon("info"), "Cypher:Ultimate": icon("info"),
  "Deadlock:Grenade": { type: "cross", length: 10, effect: "wall" }, "Deadlock:Ability1": cone(9, 60, "flash"), "Deadlock:Ability2": circle(5.5, "slow"), "Deadlock:Ultimate": line(40, 3, "damage"),
  "Fade:Grenade": icon("info"), "Fade:Ability1": circle(6, "slow"), "Fade:Ability2": circle(30, "info"), "Fade:Ultimate": line(40, 24, "info"),
  "Gekko:Grenade": circle(6, "damage"), "Gekko:Ability1": icon("flash"), "Gekko:Ability2": icon("flash"), "Gekko:Ultimate": circle(4.5, "slow"),
  "Harbor:Grenade": circle(7, "slow"), "Harbor:Ability1": wall(60, 1.5), "Harbor:Ability2": circle(4.5, "smoke"), "Harbor:Ultimate": line(36, 16, "flash"),
  "Iso:Grenade": wall(8, 1), "Iso:Ability1": line(40, 2, "damage"), "Iso:Ability2": icon(), "Iso:Ultimate": line(36, 5, "utility"),
  "Jett:Grenade": circle(3.35, "smoke"), "Jett:Ability1": icon(), "Jett:Ability2": icon(), "Jett:Ultimate": icon("damage"),
  "KAY/O:Grenade": circle(5, "damage"), "KAY/O:Ability1": icon("flash"), "KAY/O:Ability2": circle(20, "info"), "KAY/O:Ultimate": circle(42.5, "info"),
  "Killjoy:Grenade": circle(4.5, "damage"), "Killjoy:Ability1": circle(5.5, "info"), "Killjoy:Ability2": cone(40, 100, "damage"), "Killjoy:Ultimate": circle(32.5, "slow"),
  "Miks:Grenade": circle(6, "flash"), "Miks:Ability1": icon("heal"), "Miks:Ability2": circle(4.15, "smoke"), "Miks:Ultimate": cone(20, 60, "slow"),
  "Neon:Grenade": { type: "lane", length: 50, gap: 4.5, effect: "wall" }, "Neon:Ability1": circle(4.5, "flash"), "Neon:Ability2": icon(), "Neon:Ultimate": icon("damage"),
  "Omen:Grenade": circle(20, "utility"), "Omen:Ability1": line(34, 5, "flash"), "Omen:Ability2": circle(4.1, "smoke"), "Omen:Ultimate": icon(),
  "Phoenix:Grenade": wall(20, 1), "Phoenix:Ability1": circle(4.5, "damage"), "Phoenix:Ability2": icon("flash"), "Phoenix:Ultimate": icon(),
  "Raze:Grenade": icon("damage"), "Raze:Ability1": circle(3.5, "damage"), "Raze:Ability2": circle(7, "damage"), "Raze:Ultimate": circle(7, "damage"),
  "Reyna:Grenade": icon("flash"), "Reyna:Ability1": icon("heal"), "Reyna:Ability2": icon(), "Reyna:Ultimate": icon(),
  "Sage:Grenade": wall(10.5, 1.5), "Sage:Ability1": circle(7, "slow"), "Sage:Ability2": icon("heal"), "Sage:Ultimate": icon("heal"),
  "Skye:Grenade": circle(18, "heal"), "Skye:Ability1": icon("flash"), "Skye:Ability2": icon("flash"), "Skye:Ultimate": icon("info"),
  "Sova:Grenade": icon("info"), "Sova:Ability1": circle(4, "damage"), "Sova:Ability2": circle(30, "info"), "Sova:Ultimate": line(66, 2.5, "damage"),
  "Tejo:Grenade": icon("info"), "Tejo:Ability1": circle(5, "damage"), "Tejo:Ability2": circle(4.5, "damage"), "Tejo:Ultimate": line(36, 9, "damage"),
  "Veto:Grenade": icon(), "Veto:Ability1": circle(5, "slow"), "Veto:Ability2": circle(11, "utility"), "Veto:Ultimate": icon(),
  "Viper:Grenade": circle(4.5, "damage"), "Viper:Ability1": circle(4.5, "smoke"), "Viper:Ability2": wall(60, 1), "Viper:Ultimate": circle(20, "smoke"),
  "Vyse:Grenade": circle(7, "slow"), "Vyse:Ability1": wall(9, 1), "Vyse:Ability2": icon("flash"), "Vyse:Ultimate": circle(32, "info"),
  "Waylay:Grenade": circle(5, "slow"), "Waylay:Ability1": icon(), "Waylay:Ability2": icon(), "Waylay:Ultimate": line(34, 11, "slow"),
  "Yoru:Grenade": icon(), "Yoru:Ability1": icon("flash"), "Yoru:Ability2": icon(), "Yoru:Ultimate": icon(),
};

export const slotLabels: Record<string, string> = { Grenade: "C", Ability1: "Q", Ability2: "E", Ultimate: "X" };
const slotOrder = ["Grenade", "Ability1", "Ability2", "Ultimate"];

export const abilities: Ability[] = abilityAssets.map((ability) => ({ ...ability, spec: specs[ability.key] ?? icon() }));
export const abilityByKey = new Map(abilities.map((ability) => [ability.key, ability]));

export function abilitiesForAgent(agentId: string) {
  return abilities.filter((ability) => ability.agentId === agentId).sort((a, b) => slotOrder.indexOf(a.slot) - slotOrder.indexOf(b.slot));
}

export function isDirectional(spec: AbilitySpec) {
  return spec.type !== "icon" && spec.type !== "circle";
}

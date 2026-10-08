// Downloads minimaps, callouts and ability icons from Valorant-API for the tactics board.
// Usage: node scripts/fetch-tactics-assets.mjs
import { mkdir, writeFile } from "node:fs/promises";
import agents from "../app/agents.json" with { type: "json" };

const maps = ["abyss", "ascent", "haven", "summit", "split", "sunset", "lotus", "corrode", "bind"];
const slots = ["Grenade", "Ability1", "Ability2", "Ultimate"];

async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  return (await response.json()).data;
}

async function download(url, path) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} responded ${response.status}`);
  await writeFile(path, Buffer.from(await response.arrayBuffer()));
}

await mkdir("public/minimaps", { recursive: true });
await mkdir("public/abilities", { recursive: true });
await mkdir("lib/tactics", { recursive: true });

const mapData = await json("https://valorant-api.com/v1/maps");
const mapOutput = {};
for (const map of maps) {
  const entry = mapData.find((item) => item.displayName.toLowerCase() === map);
  if (!entry) throw new Error(`Map ${map} not found`);
  await download(entry.displayIcon, `public/minimaps/${map}.png`);
  // Valorant-API swaps the axes: minimap x comes from world y and vice versa.
  const toMinimap = ({ x, y }) => ({
    x: Number((y * entry.xMultiplier + entry.xScalarToAdd).toFixed(4)),
    y: Number((x * entry.yMultiplier + entry.yScalarToAdd).toFixed(4)),
  });
  mapOutput[map] = {
    // Minimap fraction covered by one in-game meter (100 units).
    meter: Math.abs(entry.xMultiplier) * 100,
    callouts: (entry.callouts ?? []).map((callout) => ({
      name: callout.superRegionName === "Attacker Side" ? `${callout.regionName} Ataque`
        : callout.superRegionName === "Defender Side" ? `${callout.regionName} Defesa`
        : callout.superRegionName === "Mid" ? callout.regionName : `${callout.superRegionName} ${callout.regionName}`,
      ...toMinimap(callout.location),
    })),
  };
}
await writeFile("lib/tactics/maps.json", JSON.stringify(mapOutput, null, 2) + "\n");

const agentData = await json("https://valorant-api.com/v1/agents?isPlayableCharacter=true&language=pt-BR");
const abilityOutput = [];
for (const agent of agents) {
  const entry = agentData.find((item) => item.uuid === agent.id);
  if (!entry) throw new Error(`Agent ${agent.name} not found`);
  for (const slot of slots) {
    const ability = entry.abilities.find((item) => item.slot === slot);
    if (!ability?.displayIcon) continue;
    const icon = `/abilities/${agent.id}-${slot.toLowerCase()}.png`;
    await download(ability.displayIcon, `public${icon}`);
    abilityOutput.push({ key: `${agent.name}:${slot}`, agentId: agent.id, slot, name: ability.displayName, icon });
  }
}
await writeFile("lib/tactics/abilities.json", JSON.stringify(abilityOutput, null, 2) + "\n");
console.log(`Saved ${maps.length} minimaps and ${abilityOutput.length} abilities.`);

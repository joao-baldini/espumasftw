import agents from "../agents.json";
import { abilityByKey, isDirectional, type AbilitySpec, type Effect } from "@/lib/tactics/abilities";
import type { BoardItem, Team } from "@/lib/tactics/board";

const agentIcons = new Map(agents.map((agent) => [agent.id, agent.icon]));
export const teamColors: Record<Team, string> = { ally: "#3fd6b0", enemy: "#ff4f64" };
const effectColors: Record<Effect, string> = { smoke: "#aab3d6", damage: "#ff7a3d", flash: "#ffe066", slow: "#5fd3ff", info: "#86e58f", wall: "#b58cff", heal: "#6bffb5", utility: "#d6d6de" };
const iconRadius = 15;

function AreaShape({ spec, meter }: { spec: AbilitySpec; meter: number }) {
  const color = effectColors[spec.effect];
  const faint = spec.type === "circle" && spec.radius > 15;
  const style = { fill: color, fillOpacity: faint ? 0.1 : spec.effect === "smoke" ? 0.5 : 0.3, stroke: color, strokeOpacity: 0.9, strokeWidth: 1.5, strokeDasharray: faint ? "6 5" : undefined };
  switch (spec.type) {
    case "circle": return <circle r={spec.radius * meter} {...style} />;
    case "cone": {
      const length = spec.length * meter;
      const half = spec.angle / 2 * Math.PI / 180;
      const [x, y] = [Math.cos(half) * length, Math.sin(half) * length];
      return <path d={`M0 0 L${x} ${-y} A${length} ${length} 0 0 1 ${x} ${y} Z`} {...style} />;
    }
    case "line": return <rect x={0} y={-spec.width * meter / 2} width={spec.length * meter} height={spec.width * meter} {...style} />;
    case "wall": return <rect x={-spec.length * meter / 2} y={-Math.max(spec.width * meter, 3) / 2} width={spec.length * meter} height={Math.max(spec.width * meter, 3)} {...style} fillOpacity={0.75} />;
    case "lane": return <>{[-1, 1].map((side) => <rect key={side} x={0} y={side * spec.gap * meter / 2 - 1.5} width={spec.length * meter} height={3} {...style} fillOpacity={0.85} />)}</>;
    case "cross": return <>{[45, -45].map((angle) => <rect key={angle} transform={`rotate(${angle})`} x={-spec.length * meter / 2} y={-1.5} width={spec.length * meter} height={3} {...style} fillOpacity={0.85} />)}</>;
    default: return null;
  }
}

export function handleDistance(spec: AbilitySpec, meter: number) {
  const reach = spec.type === "cone" || spec.type === "line" || spec.type === "lane" ? spec.length * meter : spec.type === "wall" || spec.type === "cross" ? spec.length * meter / 2 : 0;
  return Math.max(reach, 45);
}

function Token({ x, y, team, href, selected, viewRotation, radius = iconRadius }: { x: number; y: number; team: Team; href: string; selected: boolean; viewRotation: number; radius?: number }) {
  return <g transform={`translate(${x} ${y}) rotate(${-viewRotation})`}>
    {selected && <circle r={radius + 5} fill="none" stroke="#fff" strokeWidth={2} strokeDasharray="4 3" />}
    <circle r={radius} fill="#15161c" stroke={teamColors[team]} strokeWidth={2.5} />
    <image href={href} x={-radius + 3} y={-radius + 3} width={(radius - 3) * 2} height={(radius - 3) * 2} preserveAspectRatio="xMidYMid meet" />
  </g>;
}

export function BoardItemView({ item, meter, selected, viewRotation }: { item: BoardItem; meter: number; selected: boolean; viewRotation: number }) {
  switch (item.kind) {
    case "agent":
      return <g data-id={item.id} className="board-item"><Token x={item.x} y={item.y} team={item.team} href={agentIcons.get(item.agentId) ?? ""} selected={selected} viewRotation={viewRotation} radius={18} /></g>;
    case "ability": {
      const ability = abilityByKey.get(item.abilityKey);
      if (!ability) return null;
      const directional = isDirectional(ability.spec);
      return <g data-id={item.id} className="board-item">
        <g transform={`translate(${item.x} ${item.y}) rotate(${item.rotation})`}><AreaShape spec={ability.spec} meter={meter} /></g>
        <Token x={item.x} y={item.y} team={item.team} href={ability.icon} selected={selected} viewRotation={viewRotation} />
        {selected && directional && (() => {
          const distance = handleDistance(ability.spec, meter);
          const angle = item.rotation * Math.PI / 180;
          const hx = item.x + Math.cos(angle) * distance;
          const hy = item.y + Math.sin(angle) * distance;
          return <g data-handle="rotate" className="rotate-handle"><line x1={item.x} y1={item.y} x2={hx} y2={hy} stroke="#fff" strokeOpacity={0.6} strokeDasharray="3 3" /><circle cx={hx} cy={hy} r={8} fill="#ed145b" stroke="#fff" strokeWidth={2} /></g>;
        })()}
      </g>;
    }
    case "stroke":
      return <g data-id={item.id} className="board-item"><polyline points={item.points.join(" ")} fill="none" stroke="transparent" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" /><polyline points={item.points.join(" ")} fill="none" stroke={item.color} strokeWidth={selected ? 5 : 3.5} strokeLinecap="round" strokeLinejoin="round" /></g>;
    case "arrow": {
      const angle = Math.atan2(item.y2 - item.y, item.x2 - item.x);
      const head = (offset: number) => `${item.x2 - Math.cos(angle + offset) * 16},${item.y2 - Math.sin(angle + offset) * 16}`;
      return <g data-id={item.id} className="board-item"><line x1={item.x} y1={item.y} x2={item.x2} y2={item.y2} stroke="transparent" strokeWidth={14} /><line x1={item.x} y1={item.y} x2={item.x2} y2={item.y2} stroke={item.color} strokeWidth={selected ? 5 : 3.5} strokeLinecap="round" /><polygon points={`${item.x2},${item.y2} ${head(0.45)} ${head(-0.45)}`} fill={item.color} /></g>;
    }
    case "text":
      return <g data-id={item.id} className="board-item" transform={`translate(${item.x} ${item.y}) rotate(${-viewRotation})`}><text textAnchor="middle" dominantBaseline="middle" fill={item.color} fontSize={22} fontWeight={800} stroke="#0c0d11" strokeWidth={4} paintOrder="stroke" textDecoration={selected ? "underline" : undefined}>{item.text}</text></g>;
  }
}

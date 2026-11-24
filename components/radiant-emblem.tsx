export function RadiantEmblem({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" aria-hidden="true" fill="none">
    <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      {Array.from({ length: 12 }, (_, index) => <line key={index} x1="32" y1="5" x2="32" y2={index % 2 ? 12 : 16} transform={`rotate(${index * 30} 32 32)`} />)}
    </g>
    <path d="M32 18 L42 32 L32 46 L22 32 Z" fill="currentColor" />
    <path d="M32 24 L37.5 32 L32 40 L26.5 32 Z" fill="#fff" fillOpacity=".55" />
  </svg>;
}

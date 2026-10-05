// Anneau SVG simple. data : [{ value, color }]
export default function Donut({ data, size = 132, thickness = 16, children }) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const r     = (size - thickness) / 2
  const c     = 2 * Math.PI * r
  let offset  = 0

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f0f7" strokeWidth={thickness}/>
        {total > 0 && data.map((d, i) => {
          const len = (Number(d.value) / total) * c
          // Petit espace entre les segments quand il y en a plusieurs
          const gap = data.length > 1 ? Math.min(2, len / 2) : 0
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
              strokeDashoffset={-offset}
              style={{ transition: 'stroke-dasharray .5s ease' }}/>
          )
          offset += len
          return el
        })}
      </svg>
      {children && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {children}
        </div>
      )}
    </div>
  )
}

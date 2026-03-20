import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export default function MonthPicker({ month, setMonth, months }) {
  const scrollRef = useRef(null)

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 100, behavior: 'smooth' })
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>

      {/* Flèche gauche */}
      <button onClick={() => scroll(-1)} style={{
        flexShrink: 0, width: 30, height: 30, borderRadius: 10,
        border: 'none', background: '#f5f3ff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ChevronLeft size={16} color="#6C5CE7" strokeWidth={2.5} />
      </button>

      {/* Liste scrollable sans scrollbar */}
      <div ref={scrollRef} style={{
        display: 'flex', gap: 8, overflowX: 'auto', flex: 1,
        paddingBottom: 2, scrollbarWidth: 'none',
      }}
        /* Chrome / Safari */
        className="hide-scrollbar"
      >
        {months.map((m, i) => (
          <button key={i} onClick={() => setMonth(i + 1)} style={{
            flexShrink: 0, padding: '6px 14px', borderRadius: 20,
            border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, transition: 'all 0.15s',
            background: month === i + 1 ? '#6C5CE7' : '#fff',
            color:      month === i + 1 ? '#fff'    : '#555',
            boxShadow:  month === i + 1
              ? '0 2px 8px rgba(108,92,231,0.35)'
              : '0 1px 3px rgba(0,0,0,0.08)',
          }}>{m}</button>
        ))}
      </div>

      {/* Flèche droite */}
      <button onClick={() => scroll(1)} style={{
        flexShrink: 0, width: 30, height: 30, borderRadius: 10,
        border: 'none', background: '#f5f3ff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ChevronRight size={16} color="#6C5CE7" strokeWidth={2.5} />
      </button>

    </div>
  )
}
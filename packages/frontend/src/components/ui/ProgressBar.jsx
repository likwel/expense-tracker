import { pct } from '../../utils/format'
export default function ProgressBar({ value, max, color='#6C5CE7' }) {
  const p = pct(value, max)
  return (
    <div style={{ background:'#f0f0f0', borderRadius:99, height:7, overflow:'hidden', marginTop:6 }}>
      <div style={{ width:`${p}%`, height:'100%', borderRadius:99,
        background: p >= 90 ? '#e74c3c' : color,
        transition:'width 0.4s ease' }}/>
    </div>
  )
}

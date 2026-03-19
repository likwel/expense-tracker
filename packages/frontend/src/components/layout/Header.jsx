import { Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { MONTHS_FULL } from '../../utils/format'

export default function Header({ title }) {
  const { user } = useAuth()
  const now = new Date()
  return (
    <div style={{ background:'#fff', padding:'14px 20px 12px',
      boxShadow:'0 1px 0 #eee', position:'sticky', top:0, zIndex:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:'#222' }}>{title}</div>
          <div style={{ fontSize:11, color:'#bbb', display:'flex', alignItems:'center', gap:4 }}>
            <Calendar size={11}/>
            {MONTHS_FULL[now.getMonth()]} {now.getFullYear()}
          </div>
        </div>
        <div style={{ width:38, height:38, borderRadius:19, background:'#6C5CE7',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:700, fontSize:14 }}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </div>
  )
}

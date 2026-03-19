export default function StatCard({ label, value, color, icon:Icon, sub }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'14px 12px',
      boxShadow:'0 1px 3px rgba(0,0,0,0.07)', flex:1, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ width:32, height:32, borderRadius:10,
          background: color + '22',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={17} color={color} strokeWidth={1.8}/>
        </div>
        <span style={{ fontSize:10, color:'#999', fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
      </div>
      <div style={{ fontWeight:700, fontSize:16, color, lineHeight:1.2, wordBreak:'break-word' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>{sub}</div>}
    </div>
  )
}

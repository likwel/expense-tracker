export default function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)',
      zIndex:100, display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:'20px 20px 0 0',
        padding:24, width:'100%', maxWidth:480, paddingBottom:36 }}>
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'center', marginBottom:16 }}>
          <span style={{ fontWeight:700, fontSize:17, color:'#222' }}>{title}</span>
          <button onClick={onClose} style={{ background:'none', border:'none',
            cursor:'pointer', color:'#bbb', fontSize:22, lineHeight:1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

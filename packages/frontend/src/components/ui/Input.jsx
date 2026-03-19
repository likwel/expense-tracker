export default function Input({ label, error, ...props }) {
  return (
    <div style={{ marginBottom:12 }}>
      {label && <label style={{ fontSize:12, color:'#555', fontWeight:600,
        marginBottom:4, display:'block' }}>{label}</label>}
      <input {...props} style={{
        display:'block', width:'100%', padding:'12px 14px',
        borderRadius:12, fontSize:14, background:'#fafafa', outline:'none',
        border: error ? '1px solid #e74c3c' : '1px solid #eee',
        boxSizing:'border-box', ...props.style,
      }}/>
      {error && <span style={{ fontSize:11, color:'#e74c3c', marginTop:3, display:'block' }}>{error}</span>}
    </div>
  )
}

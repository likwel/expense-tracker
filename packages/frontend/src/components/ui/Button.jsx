const VARIANTS = {
  primary: { bg:'#6C5CE7', color:'#fff', border:'none' },
  danger:  { bg:'#e74c3c', color:'#fff', border:'none' },
  success: { bg:'#00b894', color:'#fff', border:'none' },
  ghost:   { bg:'transparent', color:'#555', border:'1px solid #eee' },
  dashed:  { bg:'transparent', color:'#999', border:'1.5px dashed #ddd' },
}
export default function Button({ children, onClick, variant='primary', fullWidth=false, size='md', disabled=false, style={} }) {
  const v = VARIANTS[variant] || VARIANTS.primary
  return (
    <button onClick={onClick} disabled={disabled} style={{
      width:    fullWidth ? '100%' : 'auto',
      padding:  size === 'sm' ? '4px 14px' : '8px 14px',
      borderRadius: 14, border: v.border,
      background: v.bg, color: v.color,
      fontWeight:700, fontSize: size==='sm' ? 9 : 11,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
      transition:'opacity 0.2s', ...style,
    }}>
      {children}
    </button>
  )
}

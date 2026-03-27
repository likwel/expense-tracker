export default function Card({ children, style={} }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:16,
      boxShadow:'0 2px 12px rgba(108,92,231,0.08), 0 1px 3px rgba(0,0,0,0.06)', marginBottom:12, ...style }}>
      {children}
    </div>
  )
}

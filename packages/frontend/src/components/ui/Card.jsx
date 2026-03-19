export default function Card({ children, style={} }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:16,
      boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:12, ...style }}>
      {children}
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronUp, Mail, MessageCircle } from 'lucide-react'

const FAQ = [
  {
    q: 'Comment ajouter une dépense ?',
    a: "Appuyez sur le bouton + (rouge) en bas à droite de la page Dépenses. Remplissez la catégorie, le montant et la date puis appuyez sur Enregistrer.",
  },
  {
    q: 'Comment créer une dépense récurrente ?',
    a: "Allez dans Dépenses récurrentes depuis le menu de navigation. Appuyez sur + et choisissez la fréquence (quotidien, hebdomadaire ou mensuel) ainsi que le type de jour.",
  },
  {
    q: 'Qu\'est-ce que l\'estimation dans les revenus ?',
    a: "Quand vos revenus récurrents ne sont pas encore générés pour le mois en cours, Depenzo calcule une estimation basée sur vos récurrences actives. Elle est marquée par le symbole ~.",
  },
  {
    q: 'Comment fonctionne le budget ?',
    a: "Créez un budget par catégorie de dépense. Depenzo calcule automatiquement le montant dépensé en temps réel. Des alertes vous notifient à 75%, 90% et 100% du budget.",
  },
  {
    q: 'Mes données sont-elles sécurisées ?',
    a: "Oui. Vos mots de passe sont chiffrés avec bcrypt. Les communications sont chiffrées en HTTPS/TLS. Vous pouvez supprimer votre compte et toutes vos données à tout moment.",
  },
  {
    q: 'Comment changer de devise ?',
    a: "Allez dans le menu (icône en haut à droite) → Devise. Vous pouvez choisir Ariary (Ar), Euro (€), Dollar ($) ou Livre sterling (£).",
  },
  {
    q: 'Que se passe-t-il à la fin de l\'essai gratuit ?',
    a: "Après 3 mois, vous basculez automatiquement sur le plan Gratuit (30 transactions/mois, 3 catégories). Vos données sont conservées. Vous pouvez passer au plan Pro à tout moment.",
  },
  {
    q: 'Comment exporter mes données ?',
    a: "L'export CSV est disponible sur le plan Pro depuis la page Rapports. Sur le plan Gratuit, contactez-nous à support@depenzo.app.",
  },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderRadius:12, border:'0.5px solid #eee',
      marginBottom:8, overflow:'hidden', background:'#fff' }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width:'100%', display:'flex', justifyContent:'space-between',
        alignItems:'center', padding:'14px 16px',
        background:'none', border:'none', cursor:'pointer', textAlign:'left',
        gap:12,
      }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#222', lineHeight:1.4, flex:1 }}>{q}</span>
        {open ? <ChevronUp size={16} color="#6C5CE7"/> : <ChevronDown size={16} color="#aaa"/>}
      </button>
      {open && (
        <div style={{ padding:'0 16px 14px', fontSize:13, color:'#666', lineHeight:1.7 }}>
          {a}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const navigate = useNavigate()
  return (
    <div style={{ paddingBottom:40 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12,
        padding:'16px 20px', borderBottom:'1px solid #f0f0f0',
        position:'sticky', top:0, background:'#fff', zIndex:10 }}>
        <button onClick={() => navigate(-1)}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#6C5CE7' }}>
          <ArrowLeft size={22}/>
        </button>
        <span style={{ fontWeight:800, fontSize:17, color:'#222' }}>Aide & Support</span>
      </div>

      <div style={{ padding:'20px 16px' }}>
        {/* FAQ */}
        <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
          textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:12 }}>
          Questions fréquentes
        </div>
        {FAQ.map((item, i) => <FaqItem key={i} q={item.q} a={item.a}/>)}

        {/* Contact */}
        <div style={{ fontSize:11, fontWeight:700, color:'#aaa',
          textTransform:'uppercase', letterSpacing:'0.5px', margin:'24px 0 12px' }}>
          Nous contacter
        </div>

        {[
          { icon: Mail, label: 'Email support', sub: 'support@depenzo.app', color:'#534AB7', bg:'#EEEDFE',
            action: () => window.open('mailto:support@depenzo.app') },
          { icon: MessageCircle, label: 'Chat en direct', sub: 'Lun–Ven, 8h–18h (EAT)', color:'#0F6E56', bg:'#E1F5EE',
            action: () => {} },
        ].map(({ icon: Icon, label, sub, color, bg, action }) => (
          <button key={label} onClick={action} style={{
            display:'flex', alignItems:'center', gap:14, width:'100%',
            padding:'14px 16px', borderRadius:14, marginBottom:8,
            background:'#fff', border:'0.5px solid #eee', cursor:'pointer', textAlign:'left',
          }}>
            <div style={{ width:42, height:42, borderRadius:12, background:bg, flexShrink:0,
              display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Icon size={20} color={color} strokeWidth={1.8}/>
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#222' }}>{label}</div>
              <div style={{ fontSize:12, color:'#aaa', marginTop:2 }}>{sub}</div>
            </div>
          </button>
        ))}

        {/* Version */}
        <div style={{ textAlign:'center', marginTop:24, fontSize:12, color:'#ccc' }}>
          Depenzo v1.0.0 · Antananarivo, Madagascar
        </div>
      </div>
    </div>
  )
}
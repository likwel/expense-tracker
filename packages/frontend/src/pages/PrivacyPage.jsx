import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Eye, Database, Share2, Trash2, Mail } from 'lucide-react'

const SECTIONS = [
  {
    icon: Database,
    title: 'Données collectées',
    content: [
      'Informations de compte : nom, adresse email, mot de passe (chiffré), devise préférée.',
      'Données financières : transactions, catégories, budgets, revenus et dépenses que vous saisissez volontairement.',
      'Données techniques : adresse IP, type de navigateur, système d\'exploitation, pages visitées (à des fins d\'amélioration du service).',
    ],
  },
  {
    icon: Lock,
    title: 'Utilisation des données',
    content: [
      'Fournir et améliorer le service Depenzo.',
      'Envoyer des notifications importantes (alertes budget, fin d\'essai, mises à jour).',
      'Assurer la sécurité et prévenir les fraudes.',
      'Générer des statistiques anonymisées pour améliorer l\'expérience utilisateur.',
    ],
  },
  {
    icon: Share2,
    title: 'Partage des données',
    content: [
      'Depenzo ne vend jamais vos données personnelles à des tiers.',
      'Vos données peuvent être partagées avec des prestataires techniques (hébergement, paiement) dans le strict cadre de la fourniture du service.',
      'Nous pouvons divulguer vos données si la loi l\'exige ou pour protéger nos droits légaux.',
    ],
  },
  {
    icon: Lock,
    title: 'Sécurité des données',
    content: [
      'Les mots de passe sont chiffrés avec bcrypt avant stockage.',
      'Les communications entre votre appareil et nos serveurs sont chiffrées via HTTPS/TLS.',
      'Nos serveurs sont hébergés dans des centres de données sécurisés avec accès restreint.',
      'Des audits de sécurité réguliers sont effectués.',
    ],
  },
  {
    icon: Eye,
    title: 'Cookies et traceurs',
    content: [
      'Depenzo utilise uniquement des cookies strictement nécessaires au fonctionnement du service (session, authentification).',
      'Aucun cookie publicitaire ou de tracking tiers n\'est utilisé.',
    ],
  },
  {
    icon: Trash2,
    title: 'Vos droits',
    content: [
      'Droit d\'accès : vous pouvez consulter toutes vos données depuis les paramètres de votre compte.',
      'Droit de rectification : vous pouvez modifier vos informations à tout moment.',
      'Droit à l\'effacement : vous pouvez supprimer votre compte et toutes vos données depuis les paramètres.',
      'Droit à la portabilité : vous pouvez exporter vos données au format CSV (plan Pro).',
      'Pour exercer ces droits, contactez-nous à : privacy@depenzo.app',
    ],
  },
  {
    icon: Database,
    title: 'Conservation des données',
    content: [
      'Vos données sont conservées tant que votre compte est actif.',
      'En cas de suppression de compte, toutes vos données sont supprimées définitivement sous 30 jours.',
      'Les données de facturation sont conservées 5 ans conformément aux obligations légales.',
    ],
  },
  {
    icon: Mail,
    title: 'Contact & réclamations',
    content: [
      'Pour toute question relative à vos données personnelles : privacy@depenzo.app',
      'Nous nous engageons à répondre sous 72 heures ouvrées.',
      'En cas de litige non résolu, vous pouvez saisir l\'autorité compétente de protection des données.',
    ],
  },
]

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', paddingBottom: 60 }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
        position: 'sticky', top: 0, background: '#fff', zIndex: 10,
      }}>
        <button onClick={() => navigate(-1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6C5CE7' }}>
          <ArrowLeft size={22}/>
        </button>
        <span style={{ fontWeight: 800, fontSize: 17, color: '#222' }}>
          Politique de confidentialité
        </span>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* Intro */}
        <div style={{
          background: '#E1F5EE', borderRadius: 12, padding: '14px 16px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F6E56', marginBottom: 4 }}>
            Dernière mise à jour : mars 2026
          </div>
          <div style={{ fontSize: 13, color: '#085041', lineHeight: 1.6 }}>
            La protection de vos données personnelles est une priorité pour Depenzo. Cette politique explique quelles données nous collectons, comment nous les utilisons et vos droits.
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ icon: Icon, title, content }) => (
          <div key={title} style={{
            marginBottom: 24, background: '#fafafa',
            borderRadius: 14, padding: '16px 18px',
            border: '0.5px solid #eee',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10, background: '#EEEDFE',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Icon size={16} color="#534AB7" strokeWidth={1.8}/>
              </div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#222', margin: 0 }}>
                {title}
              </h2>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 4px', listStyle: 'none',
              display: 'flex', flexDirection: 'column', gap: 8 }}>
              {content.map((line, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start',
                  gap: 8, fontSize: 13, color: '#666', lineHeight: 1.6 }}>
                  <span style={{
                    width: 5, height: 5, borderRadius: '50%', background: '#6C5CE7',
                    flexShrink: 0, marginTop: 7,
                  }}/>
                  {line}
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Footer */}
        <div style={{
          borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 8,
          fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 1.6,
        }}>
          Depenzo — Antananarivo, Madagascar<br/>
          privacy@depenzo.app
        </div>
      </div>
    </div>
  )
}
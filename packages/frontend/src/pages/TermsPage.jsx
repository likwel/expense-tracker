import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

const SECTIONS = [
  {
    title: '1. Acceptation des conditions',
    content: `En créant un compte sur Depenzo, vous acceptez les présentes Conditions Générales d'Utilisation (CGU). Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.`,
  },
  {
    title: '2. Description du service',
    content: `Depenzo est une application de gestion de finances personnelles permettant le suivi des dépenses, revenus et budgets. Le service est accessible via application mobile et web.`,
  },
  {
    title: '3. Création de compte',
    content: `Vous devez fournir des informations exactes lors de la création de votre compte. Vous êtes responsable de la confidentialité de vos identifiants et de toute activité effectuée depuis votre compte. Depenzo se réserve le droit de suspendre tout compte en cas d'utilisation frauduleuse.`,
  },
  {
    title: '4. Plans et tarification',
    content: `Depenzo propose un plan Gratuit avec des fonctionnalités limitées et un plan Pro à 15 000 Ar/mois (ou 4,99 USD à l'international). Tout nouvel utilisateur bénéficie de 3 mois d'essai Pro gratuit, sans carte bancaire requise. L'abonnement Pro est facturé mensuellement ou annuellement selon le choix effectué.`,
  },
  {
    title: '5. Résiliation et remboursement',
    content: `Vous pouvez résilier votre abonnement à tout moment depuis les paramètres de votre compte. Aucun remboursement n'est effectué pour les périodes déjà facturées. En cas de résiliation, votre accès aux fonctionnalités Pro prend fin à la date de fin de la période en cours.`,
  },
  {
    title: '6. Propriété intellectuelle',
    content: `Tous les contenus, marques, logos et éléments graphiques de Depenzo sont la propriété exclusive de Depenzo. Toute reproduction ou utilisation sans autorisation écrite est interdite.`,
  },
  {
    title: '7. Limitation de responsabilité',
    content: `Depenzo ne saurait être tenu responsable des pertes financières résultant d'une utilisation incorrecte de l'application. Les données affichées sont fournies à titre informatif uniquement et ne constituent pas un conseil financier.`,
  },
  {
    title: '8. Modifications des CGU',
    content: `Depenzo se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront notifiés par email en cas de changement majeur. La poursuite de l'utilisation du service après notification vaut acceptation des nouvelles conditions.`,
  },
  {
    title: '9. Droit applicable',
    content: `Les présentes CGU sont régies par le droit malgache. Tout litige sera soumis à la juridiction compétente d'Antananarivo, Madagascar.`,
  },
  {
    title: '10. Contact',
    content: `Pour toute question relative aux présentes CGU, contactez-nous à : legal@depenzo.app`,
  },
]

export default function TermsPage() {
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
          Conditions générales d'utilisation
        </span>
      </div>

      <div style={{ padding: '24px 24px 0' }}>

        {/* Intro */}
        <div style={{
          background: '#EEEDFE', borderRadius: 12, padding: '14px 16px', marginBottom: 28,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#3C3489', marginBottom: 4 }}>
            Dernière mise à jour : mars 2026
          </div>
          <div style={{ fontSize: 13, color: '#534AB7', lineHeight: 1.6 }}>
            Ces conditions régissent votre utilisation de Depenzo. Veuillez les lire attentivement avant de créer votre compte.
          </div>
        </div>

        {/* Sections */}
        {SECTIONS.map(({ title, content }) => (
          <div key={title} style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#222', marginBottom: 8 }}>
              {title}
            </h2>
            <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0 }}>
              {content}
            </p>
          </div>
        ))}

        {/* Footer note */}
        <div style={{
          borderTop: '1px solid #f0f0f0', paddingTop: 20, marginTop: 8,
          fontSize: 12, color: '#bbb', textAlign: 'center', lineHeight: 1.6,
        }}>
          Depenzo — Antananarivo, Madagascar<br/>
          legal@depenzo.app
        </div>
      </div>
    </div>
  )
}
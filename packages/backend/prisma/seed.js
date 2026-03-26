require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const bcrypt           = require('bcryptjs')
const prisma           = new PrismaClient()

// ── Catégories par défaut (userId null = globales) ─────────────────
const DEFAULT_CATEGORIES = [
  // Dépenses
  { name: 'Alimentation',   icon: 'ShoppingCart',  color: '#FF6B6B', type: 'expense' },
  { name: 'Transport',      icon: 'Car',            color: '#4ECDC4', type: 'expense' },
  { name: 'Logement',       icon: 'Home',           color: '#45B7D1', type: 'expense' },
  { name: 'Santé',          icon: 'Heart',          color: '#96CEB4', type: 'expense' },
  { name: 'Loisirs',        icon: 'Smile',          color: '#F39C12', type: 'expense' },
  { name: 'Éducation',      icon: 'BookOpen',       color: '#DDA0DD', type: 'expense' },
  { name: 'Vêtements',      icon: 'Tag',            color: '#F0A500', type: 'expense' },
  { name: 'Abonnements',    icon: 'Repeat',         color: '#A29BFE', type: 'expense' },
  { name: 'Eau & Énergie',  icon: 'Zap',            color: '#FD79A8', type: 'expense' },
  { name: 'Restaurants',    icon: 'Coffee',         color: '#E17055', type: 'expense' },
  { name: 'Épargne',        icon: 'PiggyBank',      color: '#00CEC9', type: 'expense' },
  { name: 'Autres',         icon: 'MoreHorizontal', color: '#B0BEC5', type: 'expense' },
  // Revenus
  { name: 'Salaire',        icon: 'Briefcase',      color: '#00B894', type: 'income'  },
  { name: 'Freelance',      icon: 'Monitor',        color: '#6C5CE7', type: 'income'  },
  { name: 'Investissement', icon: 'TrendingUp',     color: '#FDCB6E', type: 'income'  },
  { name: 'Remboursement',  icon: 'RotateCcw',      color: '#55EFC4', type: 'income'  },
  { name: 'Cadeau',         icon: 'Gift',           color: '#FD79A8', type: 'income'  },
  { name: 'Autres revenus', icon: 'PlusCircle',     color: '#74B9FF', type: 'income'  },
]

// ── Jours fériés Madagascar ────────────────────────────────────────
// Années 2025 + 2026 pour couvrir les nouveaux inscrits dès maintenant
const HOLIDAYS_MG = [
  // 2025
  { date: new Date('2025-01-01'), name: "Jour de l'An",           country: 'MG' },
  { date: new Date('2025-03-29'), name: 'Journée du souvenir',    country: 'MG' },
  { date: new Date('2025-04-18'), name: 'Vendredi Saint',         country: 'MG' },
  { date: new Date('2025-04-21'), name: 'Lundi de Pâques',        country: 'MG' },
  { date: new Date('2025-05-01'), name: 'Fête du Travail',        country: 'MG' },
  { date: new Date('2025-05-29'), name: 'Ascension',              country: 'MG' },
  { date: new Date('2025-06-09'), name: 'Lundi de Pentecôte',     country: 'MG' },
  { date: new Date('2025-06-26'), name: "Fête de l'Indépendance", country: 'MG' },
  { date: new Date('2025-08-15'), name: 'Assomption',             country: 'MG' },
  { date: new Date('2025-11-01'), name: 'Toussaint',              country: 'MG' },
  { date: new Date('2025-12-25'), name: 'Noël',                   country: 'MG' },
  // 2026
  { date: new Date('2026-01-01'), name: "Jour de l'An",           country: 'MG' },
  { date: new Date('2026-03-29'), name: 'Journée du souvenir',    country: 'MG' },
  { date: new Date('2026-04-03'), name: 'Vendredi Saint',         country: 'MG' },
  { date: new Date('2026-04-06'), name: 'Lundi de Pâques',        country: 'MG' },
  { date: new Date('2026-05-01'), name: 'Fête du Travail',        country: 'MG' },
  { date: new Date('2026-05-14'), name: 'Ascension',              country: 'MG' },
  { date: new Date('2026-05-25'), name: 'Lundi de Pentecôte',     country: 'MG' },
  { date: new Date('2026-06-26'), name: "Fête de l'Indépendance", country: 'MG' },
  { date: new Date('2026-08-15'), name: 'Assomption',             country: 'MG' },
  { date: new Date('2026-11-01'), name: 'Toussaint',              country: 'MG' },
  { date: new Date('2026-12-25'), name: 'Noël',                   country: 'MG' },
  // 2027
  { date: new Date('2027-01-01'), name: "Jour de l'An",           country: 'MG' },
  { date: new Date('2027-03-29'), name: 'Journée du souvenir',    country: 'MG' },
  { date: new Date('2027-03-26'), name: 'Vendredi Saint',         country: 'MG' },
  { date: new Date('2027-03-29'), name: 'Lundi de Pâques',        country: 'MG' },
  { date: new Date('2027-05-01'), name: 'Fête du Travail',        country: 'MG' },
  { date: new Date('2027-05-06'), name: 'Ascension',              country: 'MG' },
  { date: new Date('2027-05-17'), name: 'Lundi de Pentecôte',     country: 'MG' },
  { date: new Date('2027-06-26'), name: "Fête de l'Indépendance", country: 'MG' },
  { date: new Date('2027-08-15'), name: 'Assomption',             country: 'MG' },
  { date: new Date('2027-11-01'), name: 'Toussaint',              country: 'MG' },
  { date: new Date('2027-12-25'), name: 'Noël',                   country: 'MG' },
]

// ── Super admin de démo ────────────────────────────────────────────
// Créé uniquement si aucun utilisateur n'existe (première installation)
async function seedAdminUser() {
  const count = await prisma.user.count()
  if (count > 0) {
    console.log('  ↳ Utilisateurs existants — admin de démo ignoré')
    return
  }

  const now      = new Date()
  const trialEnd = new Date(now)
  trialEnd.setMonth(trialEnd.getMonth() + 2)

  const admin = await prisma.user.create({
    data: {
      name:            'Admin Depenzo',
      email:           process.env.ADMIN_EMAIL    || 'admin@depenzo.mg',
      password:        await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin1234!', 10),
      currency:        'MGA',
      defaultCurrency: 'MGA',
      role:            'admin',
      usageType:       'personal',
      plan:            'pro',
      trialPlan:       'pro',
      trialStartAt:    now,
      trialEndAt:      trialEnd,
    },
  })
  console.log(`  ✓ Super admin créé : ${admin.email}`)
}

// ── Catégories globales ────────────────────────────────────────────
async function seedCategories() {
  let created = 0
  let skipped = 0

  for (const cat of DEFAULT_CATEGORIES) {
    // Catégorie globale = userId null + même nom + même type
    const existing = await prisma.category.findFirst({
      where: { userId: null, name: cat.name, type: cat.type },
    })
    if (existing) { skipped++; continue }

    await prisma.category.create({ data: { ...cat, userId: null } })
    created++
  }
  console.log(`  ✓ Catégories : ${created} créées, ${skipped} déjà présentes`)
}

// ── Jours fériés ──────────────────────────────────────────────────
async function seedHolidays() {
  let created = 0
  let skipped = 0

  for (const h of HOLIDAYS_MG) {
    try {
      await prisma.publicHoliday.upsert({
        where:  { date: h.date },
        update: {},   // ne pas écraser si déjà présent
        create: h,
      })
      created++
    } catch {
      skipped++
    }
  }
  console.log(`  ✓ Jours fériés : ${created} insérés/mis à jour, ${skipped} ignorés`)
}

// ── Main ──────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱 Démarrage du seed Depenzo\n')

  console.log('👤 Super admin...')
  await seedAdminUser()

  console.log('\n🏷️  Catégories...')
  await seedCategories()

  console.log('\n📅 Jours fériés Madagascar...')
  await seedHolidays()

  console.log('\n✅ Seed terminé avec succès\n')
}

main()
  .catch(e => { console.error('\n❌ Seed échoué :', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
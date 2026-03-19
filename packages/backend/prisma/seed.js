require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const DEFAULT_CATEGORIES = [
  { name:'Alimentation',  icon:'ShoppingCart',   color:'#FF6B6B', type:'expense' },
  { name:'Transport',     icon:'Car',             color:'#4ECDC4', type:'expense' },
  { name:'Logement',      icon:'Home',            color:'#45B7D1', type:'expense' },
  { name:'Santé',         icon:'Heart',           color:'#96CEB4', type:'expense' },
  { name:'Loisirs',       icon:'Smile',           color:'#F39C12', type:'expense' },
  { name:'Éducation',     icon:'BookOpen',        color:'#DDA0DD', type:'expense' },
  { name:'Vêtements',     icon:'Tag',             color:'#F0A500', type:'expense' },
  { name:'Autres',        icon:'MoreHorizontal',  color:'#B0BEC5', type:'expense' },
  { name:'Salaire',       icon:'Briefcase',       color:'#00B894', type:'income'  },
  { name:'Freelance',     icon:'Monitor',         color:'#6C5CE7', type:'income'  },
  { name:'Investissement',icon:'TrendingUp',      color:'#FDCB6E', type:'income'  },
  { name:'Autres revenus',icon:'PlusCircle',      color:'#74B9FF', type:'income'  },
]


const HOLIDAYS_MG = [
  { date: new Date('2026-01-01'), name: 'Jour de l\'An',             country: 'MG' },
  { date: new Date('2026-03-29'), name: 'Journée du souvenir',       country: 'MG' },
  { date: new Date('2026-04-03'), name: 'Vendredi Saint',            country: 'MG' },
  { date: new Date('2026-04-06'), name: 'Lundi de Pâques',           country: 'MG' },
  { date: new Date('2026-05-01'), name: 'Fête du Travail',           country: 'MG' },
  { date: new Date('2026-05-14'), name: 'Ascension',                 country: 'MG' },
  { date: new Date('2026-05-25'), name: 'Lundi de Pentecôte',        country: 'MG' },
  { date: new Date('2026-06-26'), name: 'Fête de l\'Indépendance',   country: 'MG' },
  { date: new Date('2026-08-15'), name: 'Assomption',                country: 'MG' },
  { date: new Date('2026-11-01'), name: 'Toussaint',                 country: 'MG' },
  { date: new Date('2026-12-25'), name: 'Noël',                      country: 'MG' },
]

async function main() {
  console.log('Seeding categories...')
  for (const cat of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where:  { id: DEFAULT_CATEGORIES.indexOf(cat) + 1 },
      update: {},
      create: cat,
    })
  }
  console.log(`✓ ${DEFAULT_CATEGORIES.length} catégories insérées`)

  console.log('Seeding public holidays...')
  for (const h of HOLIDAYS_MG) {
    await prisma.publicHoliday.upsert({
      where:  { date: h.date },
      update: {},
      create: h,
    })
  }
  console.log(`✓ ${HOLIDAYS_MG.length} jours fériés insérés`)

}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

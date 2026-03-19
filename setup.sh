#!/bin/bash
set -e
PROJECT="expense-tracker"
echo ">>> Création du monorepo : $PROJECT"
mkdir -p "$PROJECT" && cd "$PROJECT"

# ══════════════════════════════════════════════════════════════════
# RACINE — npm workspaces
# ══════════════════════════════════════════════════════════════════
cat > package.json << 'EOF'
{
  "name": "expense-tracker-root",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "packages/backend",
    "packages/frontend"
  ],
  "scripts": {
    "dev":          "concurrently -n BACK,FRONT -c cyan,magenta \"npm run dev -w packages/backend\" \"npm run dev -w packages/frontend\"",
    "dev:back":     "npm run dev      -w packages/backend",
    "dev:front":    "npm run dev      -w packages/frontend",
    "build":        "npm run build    -w packages/frontend",
    "start":        "npm run start    -w packages/backend",
    "db:generate":  "npm run db:generate -w packages/backend",
    "db:migrate":   "npm run db:migrate  -w packages/backend",
    "db:seed":      "npm run db:seed     -w packages/backend",
    "db:studio":    "npm run db:studio   -w packages/backend",
    "db:reset":     "npm run db:reset    -w packages/backend",
    "lint":         "concurrently \"npm run lint -w packages/backend\" \"npm run lint -w packages/frontend\""
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
EOF

cat > .gitignore << 'EOF'
node_modules/
dist/
.env
.env.local
*.log
EOF

cat > README.md << 'EOF'
# Expense Tracker — Monorepo (npm workspaces)

## Structure
```
expense-tracker/
├── package.json          ← racine, scripts globaux
├── packages/
│   ├── backend/          ← Node.js + Express + Prisma
│   └── frontend/         ← React + Vite
```

## Démarrage

```bash
# 1. Installer toutes les dépendances (une seule commande)
npm install

# 2. Configurer l'environnement
cp packages/backend/.env.example packages/backend/.env
# → éditer DATABASE_URL, JWT_SECRET

# 3. Créer la base et appliquer les migrations
createdb expense_db
npm run db:migrate
npm run db:seed

# 4. Lancer back + front ensemble
npm run dev
```

## Commandes disponibles depuis la racine

| Commande            | Description                             |
|---------------------|-----------------------------------------|
| `npm run dev`       | Lance backend (3000) + frontend (5173)  |
| `npm run dev:back`  | Backend seul                            |
| `npm run dev:front` | Frontend seul                           |
| `npm run build`     | Build production du frontend            |
| `npm run db:migrate`| Applique les migrations Prisma          |
| `npm run db:generate`| Régénère le client Prisma              |
| `npm run db:seed`   | Insère les catégories par défaut        |
| `npm run db:studio` | Ouvre Prisma Studio (GUI base de données)|
| `npm run db:reset`  | Remet la base à zéro                    |

## Variables d'environnement — packages/backend/.env

```
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_db?schema=public"
JWT_SECRET=un_secret_tres_long_minimum_32_caracteres
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```
EOF

# ══════════════════════════════════════════════════════════════════
# BACKEND
# ══════════════════════════════════════════════════════════════════
mkdir -p packages/backend/src/{config,middleware,routes}
mkdir -p packages/backend/prisma

# ── package.json backend ──────────────────────────────────────────
cat > packages/backend/package.json << 'EOF'
{
  "name": "@expense-tracker/backend",
  "version": "1.0.0",
  "private": true,
  "main": "src/app.js",
  "scripts": {
    "dev":         "nodemon src/app.js",
    "start":       "node src/app.js",
    "db:generate": "prisma generate",
    "db:migrate":  "prisma migrate dev --name init",
    "db:seed":     "node prisma/seed.js",
    "db:studio":   "prisma studio",
    "db:reset":    "prisma migrate reset --force"
  },
  "dependencies": {
    "@prisma/client":      "^5.22.0",
    "bcryptjs":            "^2.4.3",
    "cors":                "^2.8.5",
    "dotenv":              "^16.0.0",
    "express":             "^4.18.2",
    "express-rate-limit":  "^7.0.0",
    "joi":                 "^17.9.0",
    "jsonwebtoken":        "^9.0.0",
    "pdfkit":              "^0.13.0",
    "exceljs":             "^4.3.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "prisma":  "^5.22.0"
  }
}
EOF

# ── .env.example ─────────────────────────────────────────────────
cat > packages/backend/.env.example << 'EOF'
PORT=3000
DATABASE_URL="postgresql://postgres:password@localhost:5432/expense_db?schema=public"
JWT_SECRET=change_me_with_a_very_long_random_secret_min_32chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
EOF

cat > packages/backend/.gitignore << 'EOF'
node_modules/
.env
EOF

# ── prisma/schema.prisma ──────────────────────────────────────────
cat > packages/backend/prisma/schema.prisma << 'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         Int        @id @default(autoincrement())
  name       String     @db.VarChar(100)
  email      String     @unique @db.VarChar(150)
  password   String     @db.VarChar(255)
  currency   String     @default("MGA") @db.VarChar(10)
  createdAt  DateTime   @default(now()) @map("created_at")
  expenses   Expense[]
  incomes    Income[]
  budgets    Budget[]
  categories Category[]

  @@map("users")
}

model Category {
  id       Int       @id @default(autoincrement())
  userId   Int?      @map("user_id")
  name     String    @db.VarChar(100)
  icon     String?   @db.VarChar(50)
  color    String?   @db.VarChar(20)
  type     String
  user     User?     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expenses Expense[]
  incomes  Income[]
  budgets  Budget[]

  @@map("categories")
}

model Expense {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  categoryId  Int?      @map("category_id")
  amount      Decimal   @db.Decimal(15, 2)
  description String?
  date        DateTime  @db.Date
  createdAt   DateTime  @default(now()) @map("created_at")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category? @relation(fields: [categoryId], references: [id])

  @@index([userId, date])
  @@map("expenses")
}

model Income {
  id          Int       @id @default(autoincrement())
  userId      Int       @map("user_id")
  categoryId  Int?      @map("category_id")
  amount      Decimal   @db.Decimal(15, 2)
  description String?
  date        DateTime  @db.Date
  createdAt   DateTime  @default(now()) @map("created_at")
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category    Category? @relation(fields: [categoryId], references: [id])

  @@index([userId, date])
  @@map("incomes")
}

model Budget {
  id         Int       @id @default(autoincrement())
  userId     Int       @map("user_id")
  categoryId Int?      @map("category_id")
  amount     Decimal   @db.Decimal(15, 2)
  month      Int
  year       Int
  createdAt  DateTime  @default(now()) @map("created_at")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  category   Category? @relation(fields: [categoryId], references: [id])

  @@unique([userId, categoryId, month, year])
  @@index([userId, year, month])
  @@map("budgets")
}
EOF

# ── prisma/seed.js ────────────────────────────────────────────────
cat > packages/backend/prisma/seed.js << 'EOF'
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
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
EOF

# ── src/config/prisma.js ──────────────────────────────────────────
cat > packages/backend/src/config/prisma.js << 'EOF'
require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
})

process.on('beforeExit', async () => { await prisma.$disconnect() })

module.exports = prisma
EOF

# ── src/middleware/auth.js ────────────────────────────────────────
cat > packages/backend/src/middleware/auth.js << 'EOF'
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token manquant' })
  try {
    req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}
EOF

# ── src/middleware/validate.js ────────────────────────────────────
cat > packages/backend/src/middleware/validate.js << 'EOF'
const Joi = require('joi')

module.exports = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
  if (error)
    return res.status(400).json({ error: error.details.map(d => d.message).join(', ') })
  next()
}
EOF

# ── src/routes/auth.js ────────────────────────────────────────────
cat > packages/backend/src/routes/auth.js << 'EOF'
const router   = require('express').Router()
const bcrypt   = require('bcryptjs')
const jwt      = require('jsonwebtoken')
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const validate = require('../middleware/validate')
const auth     = require('../middleware/auth')

const registerSchema = Joi.object({
  name:     Joi.string().min(2).max(100).required(),
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  currency: Joi.string().max(10).default('MGA'),
})

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().required(),
})

router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const hash = await bcrypt.hash(req.body.password, 12)
    const user = await prisma.user.create({
      data:   { ...req.body, password: hash },
      select: { id:true, name:true, email:true, currency:true, createdAt:true },
    })
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    res.status(201).json({ user, token })
  } catch (e) {
    if (e.code === 'P2002') return res.status(409).json({ error: 'Email déjà utilisé' })
    res.status(500).json({ error: e.message })
  }
})

router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { email: req.body.email } })
    if (!user || !(await bcrypt.compare(req.body.password, user.password)))
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' })
    const token = jwt.sign({ id:user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN })
    const { password: _, ...safe } = user
    res.json({ user: safe, token })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/me', auth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.id },
      select: { id:true, name:true, email:true, currency:true },
    })
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    res.json(user)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
EOF

# ── src/routes/expenses.js ────────────────────────────────────────
cat > packages/backend/src/routes/expenses.js << 'EOF'
const router   = require('express').Router()
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const auth     = require('../middleware/auth')
const validate = require('../middleware/validate')

router.use(auth)

const schema = Joi.object({
  categoryId:  Joi.number().integer().allow(null).optional(),
  amount:      Joi.number().positive().required(),
  description: Joi.string().max(500).allow('').optional(),
  date:        Joi.string().isoDate().required(),
})

const catSelect = { category: { select: { name:true, icon:true, color:true } } }

router.get('/', async (req, res) => {
  const { month, year, categoryId, take='50', skip='0' } = req.query
  const where = { userId: req.user.id }
  if (month && year) {
    const m = Number(month), y = Number(year)
    where.date = { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) }
  }
  if (categoryId) where.categoryId = Number(categoryId)
  try {
    const [data, total] = await prisma.$transaction([
      prisma.expense.findMany({ where, include: catSelect, orderBy: { date:'desc' }, take: Number(take), skip: Number(skip) }),
      prisma.expense.count({ where }),
    ])
    res.json({ data, total })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(schema), async (req, res) => {
  try {
    const row = await prisma.expense.create({
      data:    { ...req.body, userId: req.user.id, date: new Date(req.body.date) },
      include: catSelect,
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(schema), async (req, res) => {
  try {
    const row = await prisma.expense.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data:  { ...req.body, date: new Date(req.body.date) },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.expense.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
EOF

# ── src/routes/incomes.js ─────────────────────────────────────────
cat > packages/backend/src/routes/incomes.js << 'EOF'
const router   = require('express').Router()
const Joi      = require('joi')
const prisma   = require('../config/prisma')
const auth     = require('../middleware/auth')
const validate = require('../middleware/validate')

router.use(auth)

const schema = Joi.object({
  categoryId:  Joi.number().integer().allow(null).optional(),
  amount:      Joi.number().positive().required(),
  description: Joi.string().max(500).allow('').optional(),
  date:        Joi.string().isoDate().required(),
})

const catSelect = { category: { select: { name:true, icon:true, color:true } } }

router.get('/', async (req, res) => {
  const { month, year, take='50', skip='0' } = req.query
  const where = { userId: req.user.id }
  if (month && year) {
    const m = Number(month), y = Number(year)
    where.date = { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) }
  }
  try {
    const [data, total] = await prisma.$transaction([
      prisma.income.findMany({ where, include: catSelect, orderBy: { date:'desc' }, take: Number(take), skip: Number(skip) }),
      prisma.income.count({ where }),
    ])
    res.json({ data, total })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(schema), async (req, res) => {
  try {
    const row = await prisma.income.create({
      data:    { ...req.body, userId: req.user.id, date: new Date(req.body.date) },
      include: catSelect,
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(schema), async (req, res) => {
  try {
    const row = await prisma.income.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data:  { ...req.body, date: new Date(req.body.date) },
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.income.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
EOF

# ── src/routes/budgets.js ─────────────────────────────────────────
cat > packages/backend/src/routes/budgets.js << 'EOF'
const router = require('express').Router()
const prisma = require('../config/prisma')
const auth   = require('../middleware/auth')

router.use(auth)

router.get('/', async (req, res) => {
  const { month, year } = req.query
  const m = Number(month), y = Number(year)
  try {
    const budgets = await prisma.budget.findMany({
      where:   { userId: req.user.id, month: m, year: y },
      include: { category: { select: { name:true, icon:true, color:true } } },
    })
    const result = await Promise.all(budgets.map(async b => {
      const agg = await prisma.expense.aggregate({
        where: { userId: req.user.id, categoryId: b.categoryId,
          date: { gte: new Date(y, m-1, 1), lte: new Date(y, m, 0) } },
        _sum: { amount: true },
      })
      return { ...b, spent: Number(agg._sum.amount || 0) }
    }))
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', async (req, res) => {
  const { categoryId, amount, month, year } = req.body
  try {
    const row = await prisma.budget.upsert({
      where:  { userId_categoryId_month_year: {
        userId: req.user.id, categoryId: Number(categoryId),
        month: Number(month), year: Number(year),
      }},
      update: { amount: Number(amount) },
      create: { userId: req.user.id, categoryId: Number(categoryId),
        amount: Number(amount), month: Number(month), year: Number(year) },
    })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.budget.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
EOF

# ── src/routes/categories.js ──────────────────────────────────────
cat > packages/backend/src/routes/categories.js << 'EOF'
const router = require('express').Router()
const Joi    = require('joi')
const prisma = require('../config/prisma')
const auth   = require('../middleware/auth')
const validate = require('../middleware/validate')

router.use(auth)

const schema = Joi.object({
  name:  Joi.string().max(100).required(),
  icon:  Joi.string().max(50).optional(),
  color: Joi.string().max(20).optional(),
  type:  Joi.string().valid('expense','income').required(),
})

router.get('/', async (req, res) => {
  try {
    const data = await prisma.category.findMany({
      where:   { OR: [{ userId: req.user.id }, { userId: null }] },
      orderBy: { name: 'asc' },
    })
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/', validate(schema), async (req, res) => {
  try {
    const row = await prisma.category.create({ data: { ...req.body, userId: req.user.id } })
    res.status(201).json(row)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.put('/:id', validate(schema), async (req, res) => {
  try {
    const row = await prisma.category.updateMany({
      where: { id: Number(req.params.id), userId: req.user.id },
      data:  req.body,
    })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé ou catégorie système' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.delete('/:id', async (req, res) => {
  try {
    const row = await prisma.category.deleteMany({ where: { id: Number(req.params.id), userId: req.user.id } })
    if (!row.count) return res.status(404).json({ error: 'Non trouvé ou catégorie système' })
    res.json({ success: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
EOF

# ── src/routes/reports.js ─────────────────────────────────────────
cat > packages/backend/src/routes/reports.js << 'EOF'
const router  = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')
const PDFDoc  = require('pdfkit')
const ExcelJS = require('exceljs')

router.use(auth)

const dateRange = (month, year) => ({
  gte: new Date(Number(year), Number(month)-1, 1),
  lte: new Date(Number(year), Number(month), 0),
})

router.get('/summary', async (req, res) => {
  const { month, year } = req.query
  const dr = dateRange(month, year)
  try {
    const [expAgg, incAgg, byCat] = await prisma.$transaction([
      prisma.expense.aggregate({ where: { userId:req.user.id, date:dr }, _sum:{ amount:true } }),
      prisma.income.aggregate(  { where: { userId:req.user.id, date:dr }, _sum:{ amount:true } }),
      prisma.expense.groupBy({
        by: ['categoryId'],
        where: { userId:req.user.id, date:dr },
        _sum: { amount:true },
        orderBy: { _sum:{ amount:'desc' } },
      }),
    ])
    const cats = await prisma.category.findMany({
      where: { id: { in: byCat.map(b => b.categoryId).filter(Boolean) } },
    })
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]))
    res.json({
      totalExpenses: Number(expAgg._sum.amount || 0),
      totalIncomes:  Number(incAgg._sum.amount || 0),
      balance:       Number(incAgg._sum.amount || 0) - Number(expAgg._sum.amount || 0),
      byCategory:    byCat.map(b => ({ ...catMap[b.categoryId], total: Number(b._sum.amount) })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/monthly', async (req, res) => {
  const { year } = req.query
  try {
    const result = await Promise.all(
      Array.from({ length:12 }, (_,i) => i+1).map(async m => {
        const dr = dateRange(m, year)
        const [e, i] = await prisma.$transaction([
          prisma.expense.aggregate({ where:{ userId:req.user.id, date:dr }, _sum:{ amount:true } }),
          prisma.income.aggregate(  { where:{ userId:req.user.id, date:dr }, _sum:{ amount:true } }),
        ])
        return { month:m, expenses:Number(e._sum.amount||0), incomes:Number(i._sum.amount||0) }
      })
    )
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/export/pdf', async (req, res) => {
  const { month, year } = req.query
  try {
    const rows = await prisma.expense.findMany({
      where:   { userId:req.user.id, date: dateRange(month, year) },
      include: { category: { select:{ name:true } } },
      orderBy: { date:'desc' },
    })
    const doc = new PDFDoc({ margin:40 })
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=depenses-${year}-${month}.pdf`)
    doc.pipe(res)
    doc.fontSize(20).text(`Rapport dépenses — ${month}/${year}`, { align:'center' }).moveDown()
    doc.fontSize(11)
    rows.forEach(r => {
      doc.text(`${r.date.toISOString().split('T')[0]}  |  ${r.category?.name||'-'}  |  ${Number(r.amount).toLocaleString('fr-MG')} Ar  |  ${r.description||''}`)
    })
    doc.end()
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/export/excel', async (req, res) => {
  const { month, year } = req.query
  try {
    const rows = await prisma.expense.findMany({
      where:   { userId:req.user.id, date: dateRange(month, year) },
      include: { category: { select:{ name:true } } },
      orderBy: { date:'desc' },
    })
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Dépenses')
    ws.columns = [
      { header:'Date',         key:'date',     width:14 },
      { header:'Catégorie',    key:'category', width:20 },
      { header:'Montant (Ar)', key:'amount',   width:18 },
      { header:'Description',  key:'desc',     width:32 },
    ]
    rows.forEach(r => ws.addRow({
      date:     r.date.toISOString().split('T')[0],
      category: r.category?.name || '-',
      amount:   Number(r.amount),
      desc:     r.description || '',
    }))
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename=depenses-${year}-${month}.xlsx`)
    await wb.xlsx.write(res)
    res.end()
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
EOF

# ── src/app.js ────────────────────────────────────────────────────
cat > packages/backend/src/app.js << 'EOF'
require('dotenv').config()
const express   = require('express')
const cors      = require('cors')
const rateLimit = require('express-rate-limit')

const app = express()

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(rateLimit({ windowMs:15*60*1000, max:300, message:{ error:'Trop de requêtes' } }))

app.use('/api/auth',       require('./routes/auth'))
app.use('/api/expenses',   require('./routes/expenses'))
app.use('/api/incomes',    require('./routes/incomes'))
app.use('/api/budgets',    require('./routes/budgets'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/reports',    require('./routes/reports'))

app.get('/api/health', (_, res) => res.json({ status:'ok', env: process.env.NODE_ENV }))

app.use((err, req, res, _next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`\n  Backend → http://localhost:${PORT}\n`))
EOF

# ══════════════════════════════════════════════════════════════════
# FRONTEND
# ══════════════════════════════════════════════════════════════════
mkdir -p packages/frontend/src/{components/{ui,layout},pages,hooks,services,utils,contexts}

# ── package.json frontend ─────────────────────────────────────────
cat > packages/frontend/package.json << 'EOF'
{
  "name": "@expense-tracker/frontend",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev":     "vite",
    "build":   "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react":            "^18.2.0",
    "react-dom":        "^18.2.0",
    "react-router-dom": "^6.20.0",
    "lucide-react":     "^0.383.0",
    "axios":            "^1.6.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite":                 "^5.0.0",
    "tailwindcss":          "^3.4.0",
    "autoprefixer":         "^10.4.0",
    "postcss":              "^8.4.0"
  }
}
EOF

cat > packages/frontend/.gitignore << 'EOF'
node_modules/
dist/
.env.local
EOF

cat > packages/frontend/vite.config.js << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target:'http://localhost:3000', changeOrigin:true } },
  },
})
EOF

cat > packages/frontend/tailwind.config.js << 'EOF'
export default {
  content:  ['./index.html', './src/**/*.{js,jsx}'],
  theme:    { extend: {} },
  plugins:  [],
}
EOF

cat > packages/frontend/postcss.config.js << 'EOF'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
EOF

cat > packages/frontend/.env << 'EOF'
VITE_API_URL=/api
EOF

cat > packages/frontend/index.html << 'EOF'
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <title>Gestion de Dépenses</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat > packages/frontend/src/index.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #f7f8fc; color: #222; }
EOF

# ── services/api.js ───────────────────────────────────────────────
cat > packages/frontend/src/services/api.js << 'EOF'
import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  login:    (data) => api.post('/auth/login',    data),
  register: (data) => api.post('/auth/register', data),
  me:       ()     => api.get('/auth/me'),
}
export const expensesApi = {
  list:   (p) => api.get('/expenses',    { params: p }),
  create: (d) => api.post('/expenses',   d),
  update: (id,d) => api.put(`/expenses/${id}`, d),
  remove: (id)   => api.delete(`/expenses/${id}`),
}
export const incomesApi = {
  list:   (p) => api.get('/incomes',    { params: p }),
  create: (d) => api.post('/incomes',   d),
  update: (id,d) => api.put(`/incomes/${id}`, d),
  remove: (id)   => api.delete(`/incomes/${id}`),
}
export const budgetsApi = {
  list:   (p) => api.get('/budgets',    { params: p }),
  create: (d) => api.post('/budgets',   d),
  remove: (id)   => api.delete(`/budgets/${id}`),
}
export const categoriesApi = {
  list:   ()     => api.get('/categories'),
  create: (d)    => api.post('/categories', d),
  remove: (id)   => api.delete(`/categories/${id}`),
}
export const reportsApi = {
  summary: (p) => api.get('/reports/summary', { params: p }),
  monthly: (p) => api.get('/reports/monthly', { params: p }),
  pdf:     (p) => api.get('/reports/export/pdf',   { params:p, responseType:'blob' }),
  excel:   (p) => api.get('/reports/export/excel', { params:p, responseType:'blob' }),
}

export default api
EOF

# ── utils/format.js ───────────────────────────────────────────────
cat > packages/frontend/src/utils/format.js << 'EOF'
export const fmt     = (n) => `${Number(n).toLocaleString('fr-MG')} Ar`
export const pct     = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0
export const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
export const MONTHS  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
EOF

# ── hooks/useApi.js ───────────────────────────────────────────────
cat > packages/frontend/src/hooks/useApi.js << 'EOF'
import { useState, useEffect, useCallback, useRef } from 'react'
import api from '../services/api'

export function useApi(url, params = {}) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const paramsKey = JSON.stringify(params)
  const abortRef  = useRef(null)

  const fetch = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(url, { params, signal: abortRef.current.signal })
      setData(res.data)
    } catch (e) {
      if (e.name !== 'CanceledError') setError(e.response?.data?.error || e.message)
    } finally { setLoading(false) }
  }, [url, paramsKey])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
EOF

# ── contexts/AuthContext.jsx ──────────────────────────────────────
cat > packages/frontend/src/contexts/AuthContext.jsx << 'EOF'
import { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(r => setUser(r.data))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const login = async (credentials) => {
    const { data } = await authApi.login(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const register = async (credentials) => {
    const { data } = await authApi.register(credentials)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    return data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
EOF

# ── components/ui (Card, Button, Input, StatCard, ProgressBar) ────
cat > packages/frontend/src/components/ui/Card.jsx << 'EOF'
export default function Card({ children, style={} }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:16,
      boxShadow:'0 1px 3px rgba(0,0,0,0.07)', marginBottom:12, ...style }}>
      {children}
    </div>
  )
}
EOF

cat > packages/frontend/src/components/ui/Button.jsx << 'EOF'
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
      padding:  size === 'sm' ? '8px 14px' : '13px 20px',
      borderRadius: 14, border: v.border,
      background: v.bg, color: v.color,
      fontWeight:700, fontSize: size==='sm' ? 13 : 15,
      cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1,
      display:'flex', alignItems:'center', justifyContent:'center', gap:8,
      transition:'opacity 0.2s', ...style,
    }}>
      {children}
    </button>
  )
}
EOF

cat > packages/frontend/src/components/ui/Input.jsx << 'EOF'
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
EOF

cat > packages/frontend/src/components/ui/StatCard.jsx << 'EOF'
export default function StatCard({ label, value, color, icon:Icon, sub }) {
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'14px 12px',
      boxShadow:'0 1px 3px rgba(0,0,0,0.07)', flex:1, minWidth:0 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
        <div style={{ width:32, height:32, borderRadius:10,
          background: color + '22',
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon size={17} color={color} strokeWidth={1.8}/>
        </div>
        <span style={{ fontSize:10, color:'#999', fontWeight:600,
          textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
      </div>
      <div style={{ fontWeight:700, fontSize:16, color, lineHeight:1.2, wordBreak:'break-word' }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>{sub}</div>}
    </div>
  )
}
EOF

cat > packages/frontend/src/components/ui/ProgressBar.jsx << 'EOF'
import { pct } from '../../utils/format'
export default function ProgressBar({ value, max, color='#6C5CE7' }) {
  const p = pct(value, max)
  return (
    <div style={{ background:'#f0f0f0', borderRadius:99, height:7, overflow:'hidden', marginTop:6 }}>
      <div style={{ width:`${p}%`, height:'100%', borderRadius:99,
        background: p >= 90 ? '#e74c3c' : color,
        transition:'width 0.4s ease' }}/>
    </div>
  )
}
EOF

cat > packages/frontend/src/components/ui/Modal.jsx << 'EOF'
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
EOF

# ── components/layout ─────────────────────────────────────────────
cat > packages/frontend/src/components/layout/Layout.jsx << 'EOF'
import { Outlet, NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingDown, TrendingUp, Target, BarChart2 } from 'lucide-react'

const NAV = [
  { to:'/',         Icon:LayoutDashboard, label:'Accueil'  },
  { to:'/expenses', Icon:TrendingDown,    label:'Dépenses' },
  { to:'/incomes',  Icon:TrendingUp,      label:'Revenus'  },
  { to:'/budgets',  Icon:Target,          label:'Budget'   },
  { to:'/reports',  Icon:BarChart2,       label:'Rapports' },
]

export default function Layout() {
  return (
    <div style={{ maxWidth:480, margin:'0 auto', minHeight:'100vh', paddingBottom:72 }}>
      <Outlet/>
      <nav style={{ position:'fixed', bottom:0, left:'50%',
        transform:'translateX(-50%)', width:'100%', maxWidth:480,
        background:'#fff', borderTop:'1px solid #eee',
        display:'flex', zIndex:20 }}>
        {NAV.map(({ to, Icon, label }) => (
          <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
            flex:1, display:'flex', flexDirection:'column', alignItems:'center',
            padding:'10px 0 8px', color: isActive ? '#6C5CE7' : '#bbb',
            textDecoration:'none', fontSize:10, fontWeight: isActive ? 700 : 400, gap:3,
          })}>
            <Icon size={22} strokeWidth={1.8}/>
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
EOF

cat > packages/frontend/src/components/layout/Header.jsx << 'EOF'
import { Calendar } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { MONTHS_FULL } from '../../utils/format'

export default function Header({ title }) {
  const { user } = useAuth()
  const now = new Date()
  return (
    <div style={{ background:'#fff', padding:'14px 20px 12px',
      boxShadow:'0 1px 0 #eee', position:'sticky', top:0, zIndex:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:'#222' }}>{title}</div>
          <div style={{ fontSize:11, color:'#bbb', display:'flex', alignItems:'center', gap:4 }}>
            <Calendar size={11}/>
            {MONTHS_FULL[now.getMonth()]} {now.getFullYear()}
          </div>
        </div>
        <div style={{ width:38, height:38, borderRadius:19, background:'#6C5CE7',
          display:'flex', alignItems:'center', justifyContent:'center',
          color:'#fff', fontWeight:700, fontSize:14 }}>
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </div>
      </div>
    </div>
  )
}
EOF

# ── pages ─────────────────────────────────────────────────────────
cat > packages/frontend/src/pages/Login.jsx << 'EOF'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input  from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Login() {
  const [f,   setF]   = useState({ email:'', password:'' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await login(f); nav('/') }
    catch (e) { setErr(e.response?.data?.error || 'Erreur de connexion') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth:400, margin:'80px auto', padding:24 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#222', marginBottom:6 }}>Connexion</h1>
        <p style={{ color:'#aaa', fontSize:14 }}>Bienvenue sur Expense Tracker</p>
      </div>
      {err && <div style={{ background:'#fdecea', color:'#c0392b', borderRadius:10,
        padding:'10px 14px', marginBottom:12, fontSize:13 }}>{err}</div>}
      <form onSubmit={submit}>
        <Input label="Email" type="email" placeholder="vous@email.com"
          value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} required/>
        <Input label="Mot de passe" type="password" placeholder="••••••••"
          value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} required/>
        <Button fullWidth disabled={loading} style={{ marginTop:4 }}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#aaa' }}>
        Pas de compte ?{' '}
        <Link to="/register" style={{ color:'#6C5CE7', fontWeight:600 }}>Créer un compte</Link>
      </p>
    </div>
  )
}
EOF

cat > packages/frontend/src/pages/Register.jsx << 'EOF'
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Input  from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function Register() {
  const [f,   setF]   = useState({ name:'', email:'', password:'', currency:'MGA' })
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const { register } = useAuth()
  const nav = useNavigate()

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { await register(f); nav('/') }
    catch (e) { setErr(e.response?.data?.error || 'Erreur lors de l\'inscription') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth:400, margin:'60px auto', padding:24 }}>
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontSize:26, fontWeight:800, color:'#222', marginBottom:6 }}>Créer un compte</h1>
        <p style={{ color:'#aaa', fontSize:14 }}>Commencez à suivre vos finances</p>
      </div>
      {err && <div style={{ background:'#fdecea', color:'#c0392b', borderRadius:10,
        padding:'10px 14px', marginBottom:12, fontSize:13 }}>{err}</div>}
      <form onSubmit={submit}>
        <Input label="Nom complet"   type="text"     placeholder="Jean Dupont"
          value={f.name}     onChange={e=>setF(p=>({...p,name:e.target.value}))}     required/>
        <Input label="Email"         type="email"    placeholder="vous@email.com"
          value={f.email}    onChange={e=>setF(p=>({...p,email:e.target.value}))}    required/>
        <Input label="Mot de passe"  type="password" placeholder="Min. 6 caractères"
          value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} required/>
        <Button fullWidth disabled={loading} style={{ marginTop:4 }}>
          {loading ? 'Création...' : 'Créer le compte'}
        </Button>
      </form>
      <p style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#aaa' }}>
        Déjà un compte ?{' '}
        <Link to="/login" style={{ color:'#6C5CE7', fontWeight:600 }}>Se connecter</Link>
      </p>
    </div>
  )
}
EOF

cat > packages/frontend/src/pages/Dashboard.jsx << 'EOF'
import { ArrowDownCircle, ArrowUpCircle, ChevronRight, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'
import Card   from '../components/ui/Card'
import { fmt, MONTHS } from '../utils/format'
import { useApi } from '../hooks/useApi'

const now = new Date()
const PARAMS = { month: now.getMonth()+1, year: now.getFullYear() }

export default function Dashboard() {
  const nav         = useNavigate()
  const { data: summary } = useApi('/reports/summary', PARAMS)
  const { data: monthly } = useApi('/reports/monthly', { year: now.getFullYear() })
  const { data: expData } = useApi('/expenses', { ...PARAMS, take:5 })

  const totalExp = summary?.totalExpenses || 0
  const totalInc = summary?.totalIncomes  || 0
  const balance  = summary?.balance       || 0
  const expenses = expData?.data          || []

  return (
    <div>
      <Header title="Tableau de bord"/>
      <div style={{ padding:'12px 16px' }}>

        {/* Hero */}
        <div style={{ background:'#6C5CE7', borderRadius:20, padding:'22px 20px', marginBottom:14, color:'#fff' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
              <div style={{ fontSize:11, opacity:0.8, marginBottom:4, fontWeight:500, textTransform:'uppercase', letterSpacing:'0.5px' }}>Solde du mois</div>
              <div style={{ fontSize:30, fontWeight:800, letterSpacing:'-1px' }}>{fmt(balance)}</div>
              <div style={{ fontSize:11, opacity:0.65, marginTop:4 }}>{MONTHS[now.getMonth()]} {now.getFullYear()}</div>
            </div>
            <div style={{ width:42, height:42, borderRadius:21, background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Wallet size={20} color="#fff" strokeWidth={1.8}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:24, marginTop:18 }}>
            <div>
              <div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>Revenus</div>
              <div style={{ fontWeight:700, fontSize:14 }}>{fmt(totalInc)}</div>
            </div>
            <div style={{ width:1, background:'rgba(255,255,255,0.2)' }}/>
            <div>
              <div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>Dépenses</div>
              <div style={{ fontWeight:700, fontSize:14 }}>{fmt(totalExp)}</div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:14 }}>
          <div style={{ flex:1, background:'#fff', borderRadius:16, padding:'14px 12px', boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'#e8f8f2', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ArrowDownCircle size={17} color="#00b894" strokeWidth={1.8}/>
              </div>
              <span style={{ fontSize:10, color:'#999', fontWeight:600 }}>REVENUS</span>
            </div>
            <div style={{ fontWeight:700, fontSize:15, color:'#00b894' }}>{fmt(totalInc)}</div>
          </div>
          <div style={{ flex:1, background:'#fff', borderRadius:16, padding:'14px 12px', boxShadow:'0 1px 3px rgba(0,0,0,0.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
              <div style={{ width:32, height:32, borderRadius:10, background:'#fdecea', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <ArrowUpCircle size={17} color="#e74c3c" strokeWidth={1.8}/>
              </div>
              <span style={{ fontSize:10, color:'#999', fontWeight:600 }}>DÉPENSES</span>
            </div>
            <div style={{ fontWeight:700, fontSize:15, color:'#e74c3c' }}>{fmt(totalExp)}</div>
          </div>
        </div>

        {/* Transactions récentes */}
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <span style={{ fontWeight:700, fontSize:15, color:'#222' }}>Transactions récentes</span>
            <button onClick={()=>nav('/expenses')} style={{ background:'none', border:'none', color:'#6C5CE7', fontSize:12, cursor:'pointer', fontWeight:600, display:'flex', alignItems:'center', gap:2 }}>
              Voir tout <ChevronRight size={13}/>
            </button>
          </div>
          {expenses.length === 0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:'16px 0', fontSize:13 }}>Aucune transaction</div>
            : expenses.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:(e.category?.color||'#ccc')+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                  <span style={{ fontSize:14, color: e.category?.color||'#888' }}>•</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'#222', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description || e.category?.name}</div>
                  <div style={{ fontSize:11, color:'#aaa' }}>{e.category?.name} · {new Date(e.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ fontWeight:700, fontSize:13, color:'#e74c3c', flexShrink:0 }}>-{fmt(e.amount)}</div>
              </div>
            ))
          }
        </Card>

        {/* Graphique mensuel SVG */}
        {monthly && (
          <Card>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontWeight:700, fontSize:15, color:'#222' }}>Évolution {now.getFullYear()}</span>
              <div style={{ display:'flex', gap:12, fontSize:11 }}>
                <span style={{ color:'#00b894', fontWeight:600 }}>■ Rev.</span>
                <span style={{ color:'#e74c3c', fontWeight:600 }}>■ Dép.</span>
              </div>
            </div>
            <svg width="100%" viewBox="0 0 320 118" style={{ overflow:'visible' }}>
              {(() => {
                const max = Math.max(...monthly.map(d => Math.max(d.expenses, d.incomes)), 1)
                return monthly.map((d,i) => {
                  const bw=10, gap=3, gw=bw*2+gap+6
                  const x = i*(320/12) + (320/12-gw)/2
                  const hr = (d.incomes/max)*100, he = (d.expenses/max)*100
                  return (
                    <g key={i}>
                      <rect x={x}      y={100-hr} width={bw} height={hr} fill="#00b894" rx={3} opacity={0.85}/>
                      <rect x={x+bw+gap} y={100-he} width={bw} height={he} fill="#e74c3c" rx={3} opacity={0.85}/>
                      <text x={x+bw} y={115} textAnchor="middle" fontSize={8} fill="#bbb">{MONTHS[i]}</text>
                    </g>
                  )
                })
              })()}
            </svg>
          </Card>
        )}
      </div>
    </div>
  )
}
EOF

cat > packages/frontend/src/pages/Expenses.jsx << 'EOF'
import { useState } from 'react'
import { Plus, Trash2, TrendingDown } from 'lucide-react'
import Header       from '../components/layout/Header'
import Card         from '../components/ui/Card'
import Button       from '../components/ui/Button'
import Modal        from '../components/ui/Modal'
import Input        from '../components/ui/Input'
import { fmt, MONTHS } from '../utils/format'
import { useApi }   from '../hooks/useApi'
import { expensesApi, categoriesApi } from '../services/api'

const now = new Date()

export default function Expenses() {
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year]            = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
  const [saving, setSaving] = useState(false)

  const { data: expData, refetch } = useApi('/expenses',   { month, year, take:100 })
  const { data: cats }             = useApi('/categories')

  const expenses   = expData?.data || []
  const totalExp   = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const expCats    = (cats||[]).filter(c => c.type === 'expense')

  const save = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      await expensesApi.create({ ...form, amount: parseFloat(form.amount), categoryId: Number(form.categoryId)||null })
      setModal(false)
      setForm({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
      refetch()
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette dépense ?')) return
    await expensesApi.remove(id)
    refetch()
  }

  return (
    <div>
      <Header title="Dépenses"/>
      <div style={{ padding:'12px 16px' }}>
        {/* Filtre mois */}
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={()=>setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer',
              fontWeight:600, fontSize:13, transition:'all 0.15s',
              background: month===i+1 ? '#6C5CE7' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(108,92,231,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>

        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendingDown size={18} color="#e74c3c" strokeWidth={1.8}/>
              <span style={{ fontWeight:700, fontSize:15, color:'#222' }}>Total</span>
            </div>
            <span style={{ fontWeight:800, fontSize:17, color:'#e74c3c' }}>{fmt(totalExp)}</span>
          </div>
          {expenses.length === 0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:'24px 0', fontSize:13 }}>Aucune dépense ce mois</div>
            : expenses.map(e => (
              <div key={e.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:(e.category?.color||'#ccc')+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18 }}>•</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'#222', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{e.description || e.category?.name}</div>
                  <div style={{ fontSize:11, color:'#aaa' }}>{e.category?.name} · {new Date(e.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#e74c3c' }}>{fmt(e.amount)}</div>
                  <button onClick={()=>remove(e.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd', padding:0, marginTop:2 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* FAB */}
      <button onClick={()=>setModal(true)} style={{ position:'fixed', bottom:76, right:'calc(50% - 224px)', width:52, height:52, borderRadius:26, background:'#6C5CE7', border:'none', color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(108,92,231,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:15 }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {modal && (
        <Modal title="Nouvelle dépense" onClose={()=>setModal(false)}>
          <select value={form.categoryId} onChange={e=>setForm(p=>({...p,categoryId:e.target.value}))}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="number" placeholder="Montant (Ar)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/>
          <Input type="text"   placeholder="Description"  value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
          <Input type="date"   value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={()=>setModal(false)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={save} disabled={saving} style={{ flex:2, background:'#e74c3c' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
EOF

cat > packages/frontend/src/pages/Incomes.jsx << 'EOF'
import { useState } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import Header  from '../components/layout/Header'
import Card    from '../components/ui/Card'
import Button  from '../components/ui/Button'
import Modal   from '../components/ui/Modal'
import Input   from '../components/ui/Input'
import { fmt, MONTHS } from '../utils/format'
import { useApi } from '../hooks/useApi'
import { incomesApi } from '../services/api'

const now = new Date()

export default function Incomes() {
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year]            = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
  const [saving,setSaving]= useState(false)

  const { data: incData, refetch } = useApi('/incomes',    { month, year, take:100 })
  const { data: cats }             = useApi('/categories')

  const incomes   = incData?.data || []
  const totalInc  = incomes.reduce((s,i) => s + Number(i.amount), 0)
  const incCats   = (cats||[]).filter(c => c.type === 'income')

  const save = async () => {
    if (!form.amount || !form.date) return
    setSaving(true)
    try {
      await incomesApi.create({ ...form, amount: parseFloat(form.amount), categoryId: Number(form.categoryId)||null })
      setModal(false)
      setForm({ categoryId:'', amount:'', description:'', date: now.toISOString().split('T')[0] })
      refetch()
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce revenu ?')) return
    await incomesApi.remove(id)
    refetch()
  }

  return (
    <div>
      <Header title="Revenus"/>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={()=>setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
              background: month===i+1 ? '#00b894' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(0,184,148,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>
        <Card>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <TrendingUp size={18} color="#00b894" strokeWidth={1.8}/>
              <span style={{ fontWeight:700, fontSize:15, color:'#222' }}>Total</span>
            </div>
            <span style={{ fontWeight:800, fontSize:17, color:'#00b894' }}>{fmt(totalInc)}</span>
          </div>
          {incomes.length === 0
            ? <div style={{ textAlign:'center', color:'#ccc', padding:'24px 0', fontSize:13 }}>Aucun revenu ce mois</div>
            : incomes.map(i => (
              <div key={i.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #f5f5f5' }}>
                <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:(i.category?.color||'#ccc')+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18 }}>•</span>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'#222', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{i.description || i.category?.name}</div>
                  <div style={{ fontSize:11, color:'#aaa' }}>{i.category?.name} · {new Date(i.date).toLocaleDateString('fr-FR')}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontWeight:700, fontSize:13, color:'#00b894' }}>+{fmt(i.amount)}</div>
                  <button onClick={()=>remove(i.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd', padding:0, marginTop:2 }}>
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      <button onClick={()=>setModal(true)} style={{ position:'fixed', bottom:76, right:'calc(50% - 224px)', width:52, height:52, borderRadius:26, background:'#00b894', border:'none', color:'#fff', cursor:'pointer', boxShadow:'0 4px 14px rgba(0,184,148,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:15 }}>
        <Plus size={24} strokeWidth={2.5}/>
      </button>

      {modal && (
        <Modal title="Nouveau revenu" onClose={()=>setModal(false)}>
          <select value={form.categoryId} onChange={e=>setForm(p=>({...p,categoryId:e.target.value}))}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {incCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="number" placeholder="Montant (Ar)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/>
          <Input type="text"   placeholder="Description"  value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))}/>
          <Input type="date"   value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))}/>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={()=>setModal(false)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={save} disabled={saving} style={{ flex:2, background:'#00b894' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
EOF

cat > packages/frontend/src/pages/Budgets.jsx << 'EOF'
import { useState } from 'react'
import { Target, Plus, AlertTriangle } from 'lucide-react'
import Header       from '../components/layout/Header'
import Card         from '../components/ui/Card'
import Button       from '../components/ui/Button'
import Modal        from '../components/ui/Modal'
import Input        from '../components/ui/Input'
import ProgressBar  from '../components/ui/ProgressBar'
import { fmt, pct, MONTHS } from '../utils/format'
import { useApi }   from '../hooks/useApi'
import { budgetsApi } from '../services/api'

const now = new Date()

export default function Budgets() {
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year]            = useState(now.getFullYear())
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ categoryId:'', amount:'', month, year })
  const [saving,setSaving]= useState(false)

  const { data: budgets, refetch } = useApi('/budgets',    { month, year })
  const { data: cats }             = useApi('/categories')

  const list    = budgets || []
  const expCats = (cats||[]).filter(c => c.type === 'expense')

  const save = async () => {
    if (!form.categoryId || !form.amount) return
    setSaving(true)
    try {
      await budgetsApi.create({ ...form, month, year })
      setModal(false)
      setForm({ categoryId:'', amount:'', month, year })
      refetch()
    } catch(e) { alert(e.response?.data?.error || 'Erreur') }
    finally { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce budget ?')) return
    await budgetsApi.remove(id)
    refetch()
  }

  return (
    <div>
      <Header title="Budget"/>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={()=>setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
              background: month===i+1 ? '#6C5CE7' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(108,92,231,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>

        {list.length === 0
          ? <Card><div style={{ textAlign:'center', color:'#ccc', padding:'24px 0', fontSize:13 }}>
              <Target size={32} color="#e0e0e0" style={{ margin:'0 auto 8px', display:'block' }}/>
              Aucun budget ce mois
            </div></Card>
          : list.map(b => {
            const p = pct(b.spent, Number(b.amount))
            return (
              <Card key={b.id}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:38, height:38, borderRadius:12, flexShrink:0, background:(b.category?.color||'#ccc')+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Target size={18} color={b.category?.color||'#888'} strokeWidth={1.8}/>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, fontSize:14, color:'#222' }}>{b.category?.name}</div>
                    <div style={{ fontSize:11, color:'#aaa' }}>{fmt(b.spent)} / {fmt(b.amount)}</div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ fontWeight:700, fontSize:14, color: p>=90?'#e74c3c':'#00b894' }}>{p}%</div>
                    <button onClick={()=>remove(b.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#ddd' }}>×</button>
                  </div>
                </div>
                <ProgressBar value={b.spent} max={Number(b.amount)} color={b.category?.color||'#6C5CE7'}/>
                {p>=90 && (
                  <div style={{ marginTop:8, fontSize:11, color:'#e74c3c', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    <AlertTriangle size={12}/> Budget presque épuisé
                  </div>
                )}
              </Card>
            )
          })
        }

        <Button variant="dashed" fullWidth onClick={()=>setModal(true)}>
          <Plus size={16}/> Ajouter un budget
        </Button>
      </div>

      {modal && (
        <Modal title="Nouveau budget" onClose={()=>setModal(false)}>
          <select value={form.categoryId} onChange={e=>setForm(p=>({...p,categoryId:e.target.value}))}
            style={{ display:'block', width:'100%', padding:'12px 14px', borderRadius:12, border:'1px solid #eee', fontSize:14, marginBottom:10, background:'#fafafa', outline:'none' }}>
            <option value="">Catégorie</option>
            {expCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input type="number" placeholder="Montant budget (Ar)" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))}/>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <Button variant="ghost" onClick={()=>setModal(false)} style={{ flex:1 }}>Annuler</Button>
            <Button onClick={save} disabled={saving} style={{ flex:2 }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
EOF

cat > packages/frontend/src/pages/Reports.jsx << 'EOF'
import { useState } from 'react'
import { Download, PieChart } from 'lucide-react'
import Header  from '../components/layout/Header'
import Card    from '../components/ui/Card'
import Button  from '../components/ui/Button'
import { fmt, pct, MONTHS } from '../utils/format'
import { useApi } from '../hooks/useApi'
import { reportsApi } from '../services/api'

const now = new Date()

const PieChart2 = ({ data }) => {
  const total = data.reduce((s,d) => s + Number(d.total||0), 0)
  if (!total) return null
  let angle = -Math.PI/2
  const cx=55, cy=55, r=46
  return (
    <svg width="115" height="115" viewBox="0 0 115 115">
      {data.map((d,i) => {
        const slice = (Number(d.total)/total)*Math.PI*2
        const x1=cx+r*Math.cos(angle), y1=cy+r*Math.sin(angle)
        angle += slice
        const x2=cx+r*Math.cos(angle), y2=cy+r*Math.sin(angle)
        return <path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${slice>Math.PI?1:0},1 ${x2},${y2} Z`} fill={d.color||'#ccc'} stroke="#fff" strokeWidth={2}/>
      })}
      <circle cx={cx} cy={cy} r={26} fill="#fff"/>
    </svg>
  )
}

const download = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function Reports() {
  const [month, setMonth] = useState(now.getMonth()+1)
  const [year]            = useState(now.getFullYear())

  const { data: summary } = useApi('/reports/summary', { month, year })
  const totalExp = summary?.totalExpenses || 0
  const totalInc = summary?.totalIncomes  || 0
  const balance  = summary?.balance       || 0
  const byCat    = summary?.byCategory    || []
  const savings  = totalInc > 0 ? Math.round((1 - totalExp/totalInc)*100) : 0

  const exportPDF = async () => {
    try {
      const r = await reportsApi.pdf({ month, year })
      download(r.data, `depenses-${year}-${month}.pdf`)
    } catch(e) { alert('Erreur export PDF') }
  }

  const exportExcel = async () => {
    try {
      const r = await reportsApi.excel({ month, year })
      download(r.data, `depenses-${year}-${month}.xlsx`)
    } catch(e) { alert('Erreur export Excel') }
  }

  return (
    <div>
      <Header title="Rapports"/>
      <div style={{ padding:'12px 16px' }}>
        <div style={{ display:'flex', gap:8, marginBottom:12, overflowX:'auto', paddingBottom:4 }}>
          {MONTHS.map((m,i) => (
            <button key={i} onClick={()=>setMonth(i+1)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontWeight:600, fontSize:13,
              background: month===i+1 ? '#6C5CE7' : '#fff',
              color:      month===i+1 ? '#fff'     : '#555',
              boxShadow:  month===i+1 ? '0 2px 8px rgba(108,92,231,0.35)' : '0 1px 3px rgba(0,0,0,0.08)',
            }}>{m}</button>
          ))}
        </div>

        {/* Taux épargne */}
        <div style={{ background:'#00b894', borderRadius:20, padding:'20px', marginBottom:14, color:'#fff' }}>
          <div style={{ fontSize:11, opacity:0.8, marginBottom:4, textTransform:'uppercase', letterSpacing:'0.5px', fontWeight:500 }}>Taux d'épargne</div>
          <div style={{ fontSize:38, fontWeight:800, lineHeight:1 }}>{savings}%</div>
          <div style={{ display:'flex', gap:20, marginTop:14 }}>
            <div><div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>Revenus</div><div style={{ fontWeight:700, fontSize:13 }}>{fmt(totalInc)}</div></div>
            <div style={{ width:1, background:'rgba(255,255,255,0.25)' }}/>
            <div><div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>Dépenses</div><div style={{ fontWeight:700, fontSize:13 }}>{fmt(totalExp)}</div></div>
            <div style={{ width:1, background:'rgba(255,255,255,0.25)' }}/>
            <div><div style={{ fontSize:10, opacity:0.7, marginBottom:2 }}>Solde</div><div style={{ fontWeight:700, fontSize:13 }}>{fmt(balance)}</div></div>
          </div>
        </div>

        {/* Camembert */}
        {byCat.length > 0 && (
          <Card>
            <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>Répartition des dépenses</div>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <PieChart2 data={byCat}/>
              <div style={{ flex:1 }}>
                {byCat.map((c,i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:9 }}>
                    <div style={{ width:10, height:10, borderRadius:99, background:c.color||'#ccc', flexShrink:0 }}/>
                    <div style={{ flex:1, fontSize:12, color:'#555' }}>{c.name}</div>
                    <div style={{ fontSize:12, fontWeight:700, color:'#222' }}>{pct(c.total, totalExp)}%</div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Export */}
        <Card>
          <div style={{ fontWeight:700, fontSize:15, color:'#222', marginBottom:12 }}>Exporter {MONTHS[month-1]} {year}</div>
          <div style={{ display:'flex', gap:10 }}>
            <Button onClick={exportPDF}   style={{ flex:1, background:'#e74c3c', padding:'13px 0', fontSize:13 }}>
              <Download size={15}/> PDF
            </Button>
            <Button onClick={exportExcel} style={{ flex:1, background:'#00b894', padding:'13px 0', fontSize:13 }}>
              <Download size={15}/> Excel
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
EOF

# ── App.jsx ───────────────────────────────────────────────────────
cat > packages/frontend/src/App.jsx << 'EOF'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Layout    from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Expenses  from './pages/Expenses'
import Incomes   from './pages/Incomes'
import Budgets   from './pages/Budgets'
import Reports   from './pages/Reports'
import Login     from './pages/Login'
import Register  from './pages/Register'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#aaa' }}>Chargement...</div>
  return user ? children : <Navigate to="/login" replace/>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login"    element={<Login/>}/>
      <Route path="/register" element={<Register/>}/>
      <Route path="/" element={<PrivateRoute><Layout/></PrivateRoute>}>
        <Route index           element={<Dashboard/>}/>
        <Route path="expenses" element={<Expenses/>}/>
        <Route path="incomes"  element={<Incomes/>}/>
        <Route path="budgets"  element={<Budgets/>}/>
        <Route path="reports"  element={<Reports/>}/>
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes/>
    </AuthProvider>
  )
}
EOF

# ── main.jsx ──────────────────────────────────────────────────────
cat > packages/frontend/src/main.jsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App/>
    </BrowserRouter>
  </React.StrictMode>
)
EOF

# ══════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  Monorepo créé dans ./$PROJECT           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  1.  cd $PROJECT"
echo "  2.  cp packages/backend/.env.example packages/backend/.env"
echo "      → éditer DATABASE_URL et JWT_SECRET"
echo "  3.  npm install              (installe tout)"
echo "  4.  createdb expense_db"
echo "  5.  npm run db:migrate"
echo "  6.  npm run db:seed"
echo "  7.  npm run dev              (lance tout)"
echo ""
echo "  Prisma Studio → npm run db:studio"
echo "  Build prod    → npm run build"
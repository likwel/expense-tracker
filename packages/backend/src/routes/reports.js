const router  = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')
const PDFDoc  = require('pdfkit')
const ExcelJS = require('exceljs')

router.use(auth)

const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                   'Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const dateRange = (month, year) => ({
  gte: new Date(Number(year), Number(month) - 1, 1),
  lte: new Date(Number(year), Number(month),     0),
})

// ── fmtCurrency — fix séparateur milliers PDFKit ──────────────────
// toLocaleString('fr-FR') insère U+202F (espace fine) → PDFKit affiche "/"
// On formate manuellement avec un espace normal U+0020

const CURRENCY_SYMBOLS = {
  MGA:'Ar', EUR:'€',  USD:'$',  GBP:'£',
  CHF:'Fr', JPY:'¥',  CAD:'CA$', MAD:'MAD',
  XOF:'CFA', MUR:'Rs', CNY:'CNY',
}
const PREFIX_CURRENCIES = new Set(['EUR','USD','GBP','CHF','CAD'])
const NO_DECIMAL        = new Set(['JPY','MGA','XOF'])

function fmtCurrency(amount, currency = 'MGA') {
  const n      = Number(amount || 0)
  const abs    = Math.abs(n)
  const sign   = n < 0 ? '-' : ''
  const sym    = CURRENCY_SYMBOLS[currency] || currency
  const noDecim = NO_DECIMAL.has(currency)

  // Partie entière avec espace normal comme séparateur de milliers
  const intPart = Math.floor(abs).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u0020')
  const numStr  = noDecim
    ? intPart
    : `${intPart},${abs.toFixed(2).split('.')[1]}`

  const formatted = PREFIX_CURRENCIES.has(currency)
    ? `${sym}\u00A0${numStr}`   // €\u00A0 1 872,00
    : `${numStr}\u00A0${sym}`   // 1 872 000\u00A0Ar

  return `${sign}${formatted}`
}

function excelNumFmt(currency = 'MGA') {
  const sym     = CURRENCY_SYMBOLS[currency] || currency
  const noDecim = NO_DECIMAL.has(currency)
  const dec     = noDecim ? '0' : '0.00'
  return PREFIX_CURRENCIES.has(currency) ? `"${sym}"#,##${dec}` : `#,##${dec} "${sym}"`
}

// ── Taux de change ────────────────────────────────────────────────
const rateCache = new Map()
async function getRate(from, to) {
  if (from === to) return 1
  const key    = `${from}_${to}`
  const cached = rateCache.get(key)
  if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return cached.rate
  const res  = await fetch(`https://open.er-api.com/v6/latest/${from}`)
  const data = await res.json()
  const rate = data?.rates?.[to]
  if (!rate) throw new Error(`Taux introuvable : ${from} → ${to}`)
  rateCache.set(key, { rate, ts: Date.now() })
  return rate
}

async function getUserCurrency(userId) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { currency: true, defaultCurrency: true },
  })
  const currency        = user?.currency        || 'MGA'
  const defaultCurrency = user?.defaultCurrency || 'MGA'
  let conversionRate = 1
  if (currency !== defaultCurrency) {
    try { conversionRate = await getRate(defaultCurrency, currency) } catch { conversionRate = 1 }
  }
  return { currency, defaultCurrency, convert: (n) => Number(n || 0) * conversionRate }
}

// ── Estimation récurrents ─────────────────────────────────────────
function estimateRecurring(list, month, year) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const workingDays = Math.round(daysInMonth * 5 / 7)
  const mStart = new Date(Number(year), Number(month) - 1, 1)
  const mEnd   = new Date(Number(year), Number(month), 0)
  return list
    .filter(r => {
      if (!r.isActive) return false
      const start = new Date(r.startDate)
      const end   = r.endDate ? new Date(r.endDate) : null
      return start <= mEnd && (!end || end >= mStart)
    })
    .reduce((s, r) => {
      const amt = Number(r.amount)
      if (r.frequency === 'monthly') return s + amt
      if (r.frequency === 'weekly')  return s + amt * 4
      if (r.frequency === 'daily')
        return s + amt * (r.dayType === 'working' ? workingDays : daysInMonth)
      return s
    }, 0)
}

// ── Helper org ────────────────────────────────────────────────────
const getOrgMemberIds = async (userId, orgId) => {
  const member = await prisma.orgMember.findFirst({
    where: { organizationId: Number(orgId), userId },
  })
  if (!member) throw { status: 403, message: 'Accès refusé à cette organisation' }
  const members = await prisma.orgMember.findMany({
    where:  { organizationId: Number(orgId) },
    select: { userId: true },
  })
  return members.map(m => m.userId)
}

// ── Helper totaux mois ────────────────────────────────────────────
async function getMonthTotals(userIds, month, year) {
  const dr    = dateRange(month, year)
  const where = { userId: { in: userIds } }
  const [expAgg, incAgg, recurExpAgg, recurIncAgg, allRecurExp, allRecurInc] =
    await prisma.$transaction([
      prisma.expense.aggregate({ where: { ...where, date: dr }, _sum: { amount: true } }),
      prisma.income.aggregate({  where: { ...where, date: dr }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { ...where, date: dr, isRecurring: true }, _sum: { amount: true } }),
      prisma.income.aggregate({  where: { ...where, date: dr, isRecurring: true }, _sum: { amount: true } }),
      prisma.recurringExpense.findMany({ where }),
      prisma.recurringIncome.findMany({  where }),
    ])
  const punctualExp   = Number(expAgg._sum.amount || 0) - Number(recurExpAgg._sum.amount || 0)
  const genRecurExp   = Number(recurExpAgg._sum.amount || 0)
  const estRecurExp   = genRecurExp === 0 ? estimateRecurring(allRecurExp, month, year) : 0
  const totalExpenses = punctualExp + genRecurExp + estRecurExp
  const punctualInc   = Number(incAgg._sum.amount || 0) - Number(recurIncAgg._sum.amount || 0)
  const genRecurInc   = Number(recurIncAgg._sum.amount || 0)
  const estRecurInc   = genRecurInc === 0 ? estimateRecurring(allRecurInc, month, year) : 0
  const totalIncomes  = punctualInc + genRecurInc + estRecurInc
  return {
    month, totalExpenses, totalIncomes,
    balance:           totalIncomes - totalExpenses,
    punctualExpenses:  punctualExp,
    recurringExpenses: genRecurExp + estRecurExp,
    punctualIncomes:   punctualInc,
    recurringIncomes:  genRecurInc + estRecurInc,
    isExpEstimated:    estRecurExp > 0,
    isIncEstimated:    estRecurInc > 0,
  }
}

// ── Signature Depenzo ─────────────────────────────────────────────
// Bloc "cachet" en bas du dernier contenu, avant le footer
function drawSignature(doc, x, y, PW, M, currency, year, isTrial) {
  const bw = PW - M * 2   // largeur totale disponible
  const bh = 72           // hauteur du bloc signature

  // Fond
  doc.rect(x, y, bw, bh).fill('#F8F8FD')
  doc.rect(x, y, bw, bh).lineWidth(0.5).strokeColor('#E0DFF5').stroke()

  // Bande accent gauche
  doc.rect(x, y, 3, bh).fill('#534AB7')

  // Logo miniature dans la signature
  drawLogo(doc, x + 12, y + 18, 26)

  // Nom + tagline
  doc.fillColor('#534AB7').font('Helvetica-Bold').fontSize(11)
     .text('Depenzo', x + 46, y + 18, { lineBreak: false })
  doc.fillColor('#888888').font('Helvetica').fontSize(7)
     .text('Gestionnaire de finances personnelles & pro', x + 46, y + 32, { lineBreak: false })
  doc.fillColor('#aaaaaa').font('Helvetica').fontSize(7)
     .text('depenzo.mg', x + 46, y + 43, { lineBreak: false })

  // Séparateur vertical
  const sepX = x + bw / 2
  doc.moveTo(sepX, y + 10).lineTo(sepX, y + bh - 10)
     .lineWidth(0.4).strokeColor('#E0DFF5').stroke()

  // Infos rapport (droite)
  const rx = sepX + 14
  doc.fillColor('#aaaaaa').font('Helvetica').fontSize(7)
     .text('Rapport certifié généré automatiquement', rx, y + 12, { lineBreak: false })

  // Ligne 1 : devise + période
  doc.fillColor('#666677').font('Helvetica').fontSize(8)
     .text(`Devise : ${currency}`, rx, y + 24, { lineBreak: false })

  // Cachet rond "CERTIFIÉ"
  const stampX = x + bw - 54
  const stampY = y + bh / 2
  doc.circle(stampX, stampY, 22).lineWidth(1.2).strokeColor('#534AB7').stroke()
  doc.circle(stampX, stampY, 18).lineWidth(0.4).strokeColor('#AFA9EC').stroke()
  doc.fillColor('#534AB7').font('Helvetica-Bold').fontSize(5.5)
     .text('CERTIFIÉ', stampX - 13, stampY - 8,   { lineBreak: false, width: 26, align: 'center' })
  doc.fillColor('#534AB7').font('Helvetica-Bold').fontSize(6)
     .text('DEPENZO', stampX - 13, stampY - 1,     { lineBreak: false, width: 26, align: 'center' })
  doc.fillColor('#7F77DD').font('Helvetica').fontSize(5)
     .text(String(year), stampX - 13, stampY + 6, { lineBreak: false, width: 26, align: 'center' })

  // Mention essai dans la signature
  if (isTrial) {
    doc.rect(x + bw / 2 + 14, y + 36, 110, 14).fill('#EEEDFE')
    doc.fillColor('#534AB7').font('Helvetica-Bold').fontSize(6.5)
       .text('Plan Essai Gratuit — fonctionnalités limitées', x + bw / 2 + 18, y + 41, { lineBreak: false })
  }
}

// ── Logo Depenzo en SVG → bitmap via canvas (PDFKit natif) ────────
// On dessine le logo directement en primitives PDFKit
function drawLogo(doc, x, y, size = 32) {
  const r = size * 0.27  // rayon des coins du carré

  // Carré violet arrondi
  doc.roundedRect(x, y, size, size, r).fill('#534AB7')

  // Lignes grises (barres)
  doc.rect(x + size*0.23, y + size*0.45, size*0.55, size*0.07).fillOpacity(0.4).fill('#EEEDFE')
  doc.rect(x + size*0.23, y + size*0.59, size*0.36, size*0.07).fillOpacity(0.4).fill('#EEEDFE')

  // Cercle (cadran horloge)
  doc.circle(x + size*0.64, y + size*0.36, size*0.16).fillOpacity(0.15).fill('#EEEDFE')
  doc.circle(x + size*0.64, y + size*0.36, size*0.11)
     .fillOpacity(1).fill('none').lineWidth(size*0.034).strokeColor('#EEEDFE').stroke()

  // Aiguilles horloge
  doc.moveTo(x + size*0.64, y + size*0.29)
     .lineTo(x + size*0.64, y + size*0.36)
     .lineTo(x + size*0.685, y + size*0.40)
     .lineWidth(size*0.034).strokeColor('#EEEDFE').lineCap('round').stroke()

  // Barre blanche (titre)
  doc.rect(x + size*0.23, y + size*0.30, size*0.25, size*0.07).fillOpacity(1).fill('#EEEDFE')

  doc.fillOpacity(1)
}

// ── Watermark SPECIMEN pour plans trial ───────────────────────────
function drawWatermark(doc, PW, PH) {
  doc.save()
  doc.translate(PW / 2, PH / 2)
  doc.rotate(-45)
  doc.fillColor('#534AB7').fillOpacity(0.055)
     .font('Helvetica-Bold').fontSize(88)
     .text('ESSAI GRATUIT', -260, -44, { lineBreak: false })
  doc.fillOpacity(1)
  doc.restore()
}

// ── Bandeau "Généré par Depenzo" ──────────────────────────────────
function drawTrialBanner(doc, PW, isTrial) {
  if (!isTrial) return
  // Bandeau haut
  doc.rect(0, 0, PW, 18).fill('#EEEDFE')
  doc.fillColor('#534AB7').font('Helvetica-Bold').fontSize(7)
     .text('Généré avec Depenzo — Plan Essai  ·  depenzo.mg', 0, 6,
       { width: PW, align: 'center', lineBreak: false })
  doc.fillColor('#000').fillOpacity(1)
}

// ── Palette PDF partagée ──────────────────────────────────────────
const C = {
  purple:    '#534AB7', purpleL:  '#EEEDFE', purpleMid: '#7F77DD',
  teal:      '#0F6E56', tealL:    '#E1F5EE', tealMid:   '#1D9E75',
  red:       '#A32D2D', redL:     '#FCEBEB',
  amber:     '#BA7517', amberL:   '#FAEEDA',
  text:      '#1a1a2e', muted:    '#666677', border:    '#E0DFF5',
  rowAlt:    '#F8F8FD', white:    '#FFFFFF', black:     '#000000',
  green:     '#00b894', danger:   '#e74c3c',
}

// ── Helpers PDF réutilisables ─────────────────────────────────────
function makePdfHelpers(doc, M, PW, PH) {
  const fill = (x, y, w, h, color, r = 0) => {
    if (r > 0) doc.roundedRect(x, y, w, h, r).fill(color)
    else       doc.rect(x, y, w, h).fill(color)
    doc.fillColor(C.black)
  }
  const T = (text, x, y, opts = {}) =>
    doc.fillColor(opts.color || C.text)
       .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
       .fontSize(opts.size || 9)
       .text(String(text ?? ''), x, y, {
         width: opts.w || 200, align: opts.align || 'left', lineBreak: false,
       })
  const hLine = (y, color = C.border, lw = 0.5) =>
    doc.moveTo(M, y).lineTo(PW - M, y).lineWidth(lw).strokeColor(color).stroke()
  const bar = (x, y, w, h, pct, colorFill, colorBg = '#EEEEEE') => {
    doc.rect(x, y, w, h).fill(colorBg)
    doc.rect(x, y, Math.max(2, w * Math.min(pct, 1)), h).fill(colorFill)
    doc.fillColor(C.black)
  }
  return { fill, T, hLine, bar }
}

// ── GET /summary ──────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  const { month, year, orgId } = req.query
  const dr = dateRange(month, year)
  try {
    const userIds = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const where   = { userId: { in: userIds } }
    const [expAgg, incAgg, byCat,
      punctualExpAgg, recurringExpAgg, punctualIncAgg, recurringIncAgg,
      allRecurExp, allRecurInc] =
      await prisma.$transaction([
        prisma.expense.aggregate({ where: { ...where, date: dr }, _sum: { amount: true } }),
        prisma.income.aggregate({  where: { ...where, date: dr }, _sum: { amount: true } }),
        prisma.expense.groupBy({ by: ['categoryId'], where: { ...where, date: dr }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
        prisma.expense.aggregate({ where: { ...where, date: dr, isRecurring: false }, _sum: { amount: true } }),
        prisma.expense.aggregate({ where: { ...where, date: dr, isRecurring: true  }, _sum: { amount: true } }),
        prisma.income.aggregate({  where: { ...where, date: dr, isRecurring: false }, _sum: { amount: true } }),
        prisma.income.aggregate({  where: { ...where, date: dr, isRecurring: true  }, _sum: { amount: true } }),
        prisma.recurringExpense.findMany({ where }),
        prisma.recurringIncome.findMany({  where }),
      ])
    const cats   = await prisma.category.findMany({ where: { id: { in: byCat.map(b => b.categoryId).filter(Boolean) } } })
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]))
    const punctualExp       = Number(punctualExpAgg._sum.amount  || 0)
    const generatedRecurExp = Number(recurringExpAgg._sum.amount || 0)
    const estimatedRecurExp = generatedRecurExp === 0 ? estimateRecurring(allRecurExp, month, year) : 0
    const recurringExp      = generatedRecurExp + estimatedRecurExp
    const totalExpenses     = punctualExp + recurringExp
    const punctualInc       = Number(punctualIncAgg._sum.amount  || 0)
    const generatedRecurInc = Number(recurringIncAgg._sum.amount || 0)
    const estimatedRecurInc = generatedRecurInc === 0 ? estimateRecurring(allRecurInc, month, year) : 0
    const recurringInc      = generatedRecurInc + estimatedRecurInc
    const totalIncomes      = punctualInc + recurringInc
    const balance   = totalIncomes - totalExpenses
    const savingPct = totalIncomes > 0 ? Math.round((balance / totalIncomes) * 100) : 0
    res.json({
      totalExpenses, totalIncomes, balance, savingRate: savingPct,
      punctualExpenses: punctualExp,   recurringExpenses: recurringExp,  isExpEstimated: estimatedRecurExp > 0,
      punctualIncomes:  punctualInc,   recurringIncomes:  recurringInc,  isIncEstimated: estimatedRecurInc > 0,
      byCategory: byCat.map(b => ({ ...catMap[b.categoryId], total: Number(b._sum.amount) })),
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── GET /monthly ──────────────────────────────────────────────────
router.get('/monthly', async (req, res) => {
  const { year, orgId } = req.query
  try {
    const userIds = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const result  = await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(m => getMonthTotals(userIds, m, year))
    )
    res.json(result)
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── GET /evolution ────────────────────────────────────────────────
router.get('/evolution', async (req, res) => {
  const refMonth = Number(req.query.month) || new Date().getMonth() + 1
  const refYear  = Number(req.query.year)  || new Date().getFullYear()
  const { orgId } = req.query
  try {
    const userIds = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const months  = Array.from({ length: 12 }, (_, i) => {
      let m = refMonth - (11 - i), y = refYear
      if (m <= 0) { m += 12; y -= 1 }
      return { m, y }
    })
    const result = await Promise.all(months.map(({ m, y }) => getMonthTotals(userIds, m, y)))
    res.json({ months: result.map((r, i) => ({ ...r, year: months[i].y, label: MONTHS_FR[months[i].m - 1].slice(0, 3) })) })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── GET /annual ───────────────────────────────────────────────────
router.get('/annual', async (req, res) => {
  const { year, orgId } = req.query
  try {
    const userIds   = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const months    = await Promise.all(Array.from({ length: 12 }, (_, i) => i + 1).map(m => getMonthTotals(userIds, m, year)))
    const totalIncomes  = months.reduce((s, m) => s + m.totalIncomes,  0)
    const totalExpenses = months.reduce((s, m) => s + m.totalExpenses, 0)
    const balance       = totalIncomes - totalExpenses
    const savingRate    = totalIncomes > 0 ? Math.round((balance / totalIncomes) * 100) : 0
    const bestMonth     = months.reduce((a, b) => b.balance > a.balance ? b : a, months[0])
    const worstMonth    = months.reduce((a, b) => b.totalExpenses > a.totalExpenses ? b : a, months[0])
    res.json({
      year: Number(year),
      months: months.map(m => ({ ...m, label: MONTHS_FR[m.month - 1].slice(0, 3) })),
      totalIncomes, totalExpenses, balance, savingRate,
      bestMonth:  { ...bestMonth,  label: MONTHS_FR[bestMonth.month  - 1] },
      worstMonth: { ...worstMonth, label: MONTHS_FR[worstMonth.month - 1] },
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── Helper partagé : résout showSignature depuis userId ───────────
async function resolveShowSignature(userId) {
  const u = await prisma.user.findUnique({
    where:  { id: userId },
    select: { planEndAt: true, trialEndAt: true, role: true },
  })
  const now    = new Date()
  const isPaid = !!(u?.planEndAt  && now <= new Date(u.planEndAt))
  return {
    isPaid,
    isTrial:       !isPaid && !!(u?.trialEndAt && now <= new Date(u.trialEndAt)),
    showSignature: u?.role !== 'admin' && !isPaid,
  }
}

// ── GET /export/pdf ───────────────────────────────────────────────
router.get('/export/pdf', async (req, res) => {
  const { month, year, orgId } = req.query
  if (!month || !year) return res.status(400).json({ error: 'month et year requis' })
  try {
    const { currency, convert }              = await getUserCurrency(req.user.id)
    const { showSignature, isTrial }         = await resolveShowSignature(req.user.id)
    const fmt = n => fmtCurrency(convert(n), currency)

    const userIds = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const where   = { userId: { in: userIds } }

    const mStart      = new Date(Number(year), Number(month) - 1, 1)
    const mEnd        = new Date(Number(year), Number(month), 0)
    const daysInMonth = mEnd.getDate()
    const workingDays = Math.round(daysInMonth * 5 / 7)

    const filterActive = list => list.filter(r => {
      if (!r.isActive) return false
      const start = new Date(r.startDate)
      const end   = r.endDate ? new Date(r.endDate) : null
      return start <= mEnd && (!end || end >= mStart)
    })
    const estimateRec = list => list.reduce((s, r) => {
      const amt = Number(r.amount)
      if (r.frequency === 'monthly') return s + amt
      if (r.frequency === 'weekly')  return s + amt * 4
      if (r.frequency === 'daily')   return s + amt * (r.dayType === 'working' ? workingDays : daysInMonth)
      return s
    }, 0)

    const [expenses, incomes, allRecurExp, allRecurInc] = await Promise.all([
      prisma.expense.findMany({
        where:   { ...where, date: dateRange(month, year) },
        include: { category: { select: { name: true, color: true, icon: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.income.findMany({
        where:   { ...where, date: dateRange(month, year) },
        include: { category: { select: { name: true, color: true, icon: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.recurringExpense.findMany({ where }),
      prisma.recurringIncome.findMany({  where }),
    ])

    const generatedRecurExp = expenses.filter(e => e.recurringExpenseId != null).reduce((s, e) => s + Number(e.amount), 0)
    const generatedRecurInc = incomes.filter(i => i.recurringIncomeId  != null).reduce((s, i) => s + Number(i.amount), 0)
    const recurExp     = generatedRecurExp > 0 ? generatedRecurExp : estimateRec(filterActive(allRecurExp))
    const recurInc     = generatedRecurInc > 0 ? generatedRecurInc : estimateRec(filterActive(allRecurInc))
    const punctualExp  = expenses.reduce((s, e) => s + Number(e.amount), 0) - generatedRecurExp
    const punctualInc  = incomes.reduce((s, i)  => s + Number(i.amount), 0) - generatedRecurInc
    const totalExpFull = punctualExp + recurExp
    const totalIncFull = punctualInc + recurInc
    const balance      = totalIncFull - totalExpFull
    const savingPct    = totalIncFull > 0 ? Math.round((balance / totalIncFull) * 100) : 0

    const expByCat = {}
    expenses.forEach(e => {
      const k = e.category?.name || 'Sans catégorie'
      if (!expByCat[k]) expByCat[k] = 0
      expByCat[k] += Number(e.amount)
    })
    const topCats = Object.entries(expByCat).sort((a, b) => b[1] - a[1]).slice(0, 5)

    const doc = new PDFDoc({ margin: 0, size: 'A4', bufferPages: true })
    const PW  = 595, PH = 842, M = 40
    const { fill, T, hLine, bar } = makePdfHelpers(doc, M, PW, PH)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${year}-${String(month).padStart(2,'0')}.pdf`)
    doc.pipe(res)

    // HEADER
    const headerTop = showSignature ? 18 : 0
    fill(0, headerTop, PW, 100, C.purple)
    drawLogo(doc, M, headerTop + 18, 36)
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(20)
       .text(`Relevé Financier — ${MONTHS_FR[Number(month) - 1]} ${year}`,
         M + 46, headerTop + 24, { width: PW - M * 2 - 46, lineBreak: false })
    doc.fillColor('#AFA9EC').font('Helvetica').fontSize(9)
       .text(`Devise : ${currency}  ·  Émis le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
         M + 46, headerTop + 50, { width: PW - M * 2 - 46, lineBreak: false })
    doc.fillColor('#AFA9EC').fontSize(8)
       .text(`Période : 01/${String(month).padStart(2,'0')}/${year} – ${daysInMonth}/${String(month).padStart(2,'0')}/${year}`,
         M + 46, headerTop + 66, { width: PW - M * 2 - 46, lineBreak: false })
    fill(0, headerTop + 98, PW, 3, C.purpleMid)

    // KPI CARDS
    const cardY = headerTop + 116
    const cardH = 84
    const cardW = (PW - M * 2 - 20) / 3
    const kpiCards = [
      { title: 'Revenus',   value: fmt(totalIncFull), sub: `Ponct. ${fmt(punctualInc)} · Récur. ${fmt(recurInc)}`,   bg: C.tealL,   accent: C.teal,   barPct: 1 },
      { title: 'Dépenses',  value: fmt(totalExpFull), sub: `Ponct. ${fmt(punctualExp)} · Récur. ${fmt(recurExp)}`,   bg: C.redL,    accent: C.red,    barPct: totalIncFull > 0 ? Math.min(totalExpFull / totalIncFull, 1) : 0 },
      { title: 'Solde net', value: `${balance >= 0 ? '+' : ''}${fmt(balance)}`,
        sub: `Taux d'épargne : ${savingPct} %`,
        bg: balance >= 0 ? C.purpleL : C.redL,
        accent: balance >= 0 ? C.purple : C.red,
        barPct: totalIncFull > 0 ? Math.max(0, balance / totalIncFull) : 0 },
    ]
    kpiCards.forEach((c, i) => {
      const cx = M + i * (cardW + 10)
      fill(cx, cardY, cardW, cardH, c.bg, 8)
      fill(cx, cardY, 4, cardH, c.accent, 0)
      T(c.title, cx + 14, cardY + 10, { color: c.accent, bold: true, size: 8,  w: cardW - 20 })
      T(c.value, cx + 14, cardY + 23, { color: C.text,   bold: true, size: 12, w: cardW - 20 })
      bar(cx + 14, cardY + 50, cardW - 28, 4, c.barPct, c.accent, '#DDDDE8')
      T(c.sub,   cx + 14, cardY + 60, { color: C.muted, size: 7, w: cardW - 20 })
    })

    // TOP CATÉGORIES
    let y = cardY + cardH + 16
    if (topCats.length > 0) {
      fill(M, y, PW - M * 2, 22, C.purple, 6)
      T('Top catégories de dépenses', M + 12, y + 6, { color: C.white, bold: true, size: 10, w: PW - M * 2 })
      y += 28
      const maxCat = topCats[0][1]
      topCats.forEach(([name, total]) => {
        fill(M, y, PW - M * 2, 18, C.rowAlt, 0)
        T(name, M + 10, y + 5, { color: C.text, size: 8, w: 150 })
        bar(M + 170, y + 7, PW - M * 2 - 170 - 90, 4, total / maxCat, C.red, '#F5D8D8')
        T(fmt(total), M + 10, y + 5, { color: C.red, bold: true, size: 8, w: PW - M * 2 - 20, align: 'right' })
        hLine(y + 18, C.border, 0.3)
        y += 18
      })
      y += 10
    }

    const newPage = () => {
      if (y > 760) {
        doc.addPage(); y = M
        fill(0, 0, PW, 28, C.purple)
        T(`${MONTHS_FR[Number(month) - 1]} ${year} — suite`, M, 9, { color: C.white, bold: true, size: 11, w: 300 })
        y = 36
      }
    }

    const listCols = [
      { label: 'Date',        w: 52,  align: 'left'   },
      { label: 'Description', w: 160, align: 'left'   },
      { label: 'Catégorie',   w: 110, align: 'left'   },
      { label: 'Type',        w: 68,  align: 'center' },
      { label: 'Montant',     w: 95,  align: 'right'  },
    ]

    const tableHeader = () => {
      fill(M, y, PW - M * 2, 18, C.rowAlt, 0)
      hLine(y, C.border)
      let cx = M + 8
      listCols.forEach(col => {
        T(col.label, cx, y + 5, { color: C.muted, bold: true, size: 7, w: col.w, align: col.align })
        cx += col.w
      })
      y += 18; hLine(y, C.border)
    }

    const tableRow = (item, idx, isIncome) => {
      newPage()
      const rowH = 18
      fill(M, y, PW - M * 2, rowH, idx % 2 === 0 ? C.rowAlt : C.white, 0)
      let cx = M + 8
      T(new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
        cx, y + 5, { size: 8, w: listCols[0].w }); cx += listCols[0].w
      T(item.description || item.category?.name || '—',
        cx, y + 5, { size: 8, w: listCols[1].w - 8 }); cx += listCols[1].w
      T(item.category?.name || '—',
        cx, y + 5, { size: 8, w: listCols[2].w - 8, color: C.muted }); cx += listCols[2].w
      T(item.isRecurring ? '~ Récurrent' : '· Ponctuel',
        cx, y + 5, { size: 7, w: listCols[3].w, align: 'center',
          color: item.isRecurring ? C.purple : C.muted }); cx += listCols[3].w
      T(fmt(item.amount), cx, y + 5, {
        size: 8, bold: true, w: listCols[4].w, align: 'right',
        color: isIncome ? C.teal : C.red,
      })
      hLine(y + rowH, C.border, 0.3); y += rowH
    }

    const sectionHeader = (label, total, accent, bg) => {
      newPage()
      fill(M, y, PW - M * 2, 26, bg, 6)
      fill(M, y, 4, 26, accent, 0)
      T(label, M + 14, y + 7, { color: accent, bold: true, size: 11, w: PW - M * 2 - 120 })
      T(fmt(total), M + 14, y + 7, { color: accent, bold: true, size: 11, w: PW - M * 2 - 20, align: 'right' })
      y += 32
    }

    const sectionFooter = (pVal, rVal, total, color) => {
      newPage()
      fill(M, y, PW - M * 2, 22, color + '22', 4)
      T(`Ponctuels : ${fmt(pVal)}`, M + 14, y + 7, { color: C.muted, size: 8, w: 200 })
      T(`Récurrents : ${fmt(rVal)}`, M + 14, y + 7, { color: C.muted, size: 8, w: PW - M * 2 - 20, align: 'center' })
      T(`Total : ${fmt(total)}`, M + 14, y + 7, { color, bold: true, size: 9, w: PW - M * 2 - 20, align: 'right' })
      y += 28
    }

    // REVENUS
    sectionHeader('Revenus du mois', totalIncFull, C.teal, C.tealL)
    tableHeader()
    if (!incomes.length) { T('Aucun revenu enregistré ce mois', M + 10, y + 6, { color: C.muted, size: 9, w: PW - M * 2 }); y += 22 }
    else incomes.forEach((r, i) => tableRow(r, i, true))
    sectionFooter(punctualInc, recurInc, totalIncFull, C.teal)

    // DÉPENSES
    sectionHeader('Dépenses du mois', totalExpFull, C.red, C.redL)
    tableHeader()
    if (!expenses.length) { T('Aucune dépense enregistrée ce mois', M + 10, y + 6, { color: C.muted, size: 9, w: PW - M * 2 }); y += 22 }
    else expenses.forEach((r, i) => tableRow(r, i, false))
    sectionFooter(punctualExp, recurExp, totalExpFull, C.red)

    // SOLDE FINAL
    newPage()
    y += 6; hLine(y, C.purple, 1.5); y += 8
    fill(M, y, PW - M * 2, 36, balance >= 0 ? C.purpleL : C.redL, 8)
    fill(M, y, 4, 36, balance >= 0 ? C.purple : C.red, 0)
    T('SOLDE NET DU MOIS', M + 14, y + 8, { bold: true, size: 11, w: PW - M * 2 - 120, color: C.text })
    T(`${balance >= 0 ? '+' : ''}${fmt(balance)}`, M + 14, y + 8, {
      bold: true, size: 14, w: PW - M * 2 - 20, align: 'right',
      color: balance >= 0 ? C.purple : C.danger,
    })
    T(`Taux d'épargne : ${savingPct} %`, M + 14, y + 22, { size: 8, color: C.muted, w: PW - M * 2 - 20 })
    y += 44

    // SIGNATURE (seulement si showSignature)
    if (showSignature) {
      y += 14
      newPage()
      drawSignature(doc, M, y, PW, M, currency, year, isTrial)
      y += 86
    }

    // FOOTER
    doc.flushPages()
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      if (showSignature) drawWatermark(doc, PW, PH)
      drawTrialBanner(doc, PW, showSignature)
      fill(0, PH - 26, PW, 26, C.purple)
      doc.fillColor('#AFA9EC').font('Helvetica').fontSize(7)
         .text(`Depenzo  ·  ${MONTHS_FR[Number(month) - 1]} ${year}  ·  ${currency}  ·  Page ${i + 1} / ${pageCount}`,
           M, PH - 15, { width: PW - M * 2, align: 'center', lineBreak: false })
      if (showSignature) {
        doc.fillColor('#7F77DD').font('Helvetica').fontSize(6)
           .text('Rapport généré avec Depenzo — depenzo.mg',
             M, PH - 7, { width: PW - M * 2, align: 'center', lineBreak: false })
      }
    }
    doc.end()
  } catch (e) {
    console.error('PDF mensuel error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
  }
})

// ── GET /export/annual/pdf ────────────────────────────────────────
router.get('/export/annual/pdf', async (req, res) => {
  const { year, orgId } = req.query
  if (!year) return res.status(400).json({ error: 'Année requise' })
  try {
    const { currency, convert }           = await getUserCurrency(req.user.id)
    const { showSignature, isTrial }      = await resolveShowSignature(req.user.id)
    const fmt = n => fmtCurrency(convert(n), currency)

    const userIds    = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const months     = await Promise.all(Array.from({ length: 12 }, (_, i) => i + 1).map(m => getMonthTotals(userIds, m, year)))
    const totalInc   = months.reduce((s, m) => s + m.totalIncomes,  0)
    const totalExp   = months.reduce((s, m) => s + m.totalExpenses, 0)
    const balance    = totalInc - totalExp
    const saving     = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0
    const paidMonths = months.filter(m => m.totalIncomes > 0 || m.totalExpenses > 0)
    const bestMonth  = paidMonths.length ? paidMonths.reduce((a, b) => b.balance  > a.balance  ? b : a) : null
    const worstMonth = paidMonths.length ? paidMonths.reduce((a, b) => b.balance  < a.balance  ? b : a) : null

    const doc = new PDFDoc({ margin: 0, size: 'A4', bufferPages: true })
    const PW  = 595, PH = 842, M = 40
    const { fill, T, hLine, bar } = makePdfHelpers(doc, M, PW, PH)

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=bilan-annuel-${year}.pdf`)
    doc.pipe(res)

    // HEADER
    const headerTop = showSignature ? 18 : 0
    fill(0, headerTop, PW, 110, C.purple)
    drawLogo(doc, M, headerTop + 20, 38)
    doc.fillColor(C.white).font('Helvetica-Bold').fontSize(22)
       .text(`Bilan Annuel ${year}`, M + 50, headerTop + 28, { width: PW - M * 2 - 50, lineBreak: false })
    doc.fillColor('#AFA9EC').font('Helvetica').fontSize(10)
       .text(`Rapport financier annuel · Devise : ${currency}`, M + 50, headerTop + 54, { width: 300, lineBreak: false })
    doc.fillColor('#AFA9EC').fontSize(9)
       .text(`Émis le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`,
         PW - M - 200, headerTop + 54, { width: 200, align: 'right', lineBreak: false })
    fill(0, headerTop + 108, PW, 3, C.purpleMid)

    // KPI CARDS
    const cardY = headerTop + 128
    const cardH = 90
    const cardW = (PW - M * 2 - 20) / 3
    ;[
      { title: 'Revenus annuels',    value: fmt(totalInc), sub: `${paidMonths.length} mois actifs`,                          bg: C.tealL,                           accent: C.teal,                       barPct: 1,                                                       barColor: C.teal   },
      { title: 'Dépenses annuelles', value: fmt(totalExp), sub: totalInc > 0 ? `${Math.round((totalExp/totalInc)*100)} % des revenus` : '—', bg: C.redL,           accent: C.red,                        barPct: totalInc > 0 ? totalExp / totalInc : 0,                  barColor: C.red    },
      { title: 'Épargne nette',      value: fmt(balance),  sub: `Taux d'épargne : ${saving} %`, bg: balance >= 0 ? C.purpleL : C.redL, accent: balance >= 0 ? C.purple : C.red, barPct: totalInc > 0 ? Math.max(0, balance / totalInc) : 0, barColor: balance >= 0 ? C.purple : C.red },
    ].forEach((c, i) => {
      const cx = M + i * (cardW + 10)
      fill(cx, cardY, cardW, cardH, c.bg, 8)
      fill(cx, cardY, 4, cardH, c.accent, 0)
      T(c.title, cx + 14, cardY + 12, { color: c.accent, bold: true, size: 8,  w: cardW - 20 })
      T(c.value, cx + 14, cardY + 26, { color: C.text,   bold: true, size: 13, w: cardW - 20 })
      bar(cx + 14, cardY + 54, cardW - 28, 5, c.barPct, c.barColor, '#DDDDE8')
      T(c.sub,   cx + 14, cardY + 66, { color: C.muted, size: 8, w: cardW - 20 })
    })

    // STATS SECONDAIRES
    const statY = cardY + cardH + 18
    const statW = (PW - M * 2 - 20) / 2
    if (bestMonth) {
      fill(M, statY, statW, 44, C.amberL, 6); fill(M, statY, 4, 44, C.amber, 0)
      T('Meilleur mois', M + 14, statY + 8, { color: C.amber, bold: true, size: 8, w: statW - 20 })
      T(MONTHS_FR[bestMonth.month - 1], M + 14, statY + 20, { color: C.text, bold: true, size: 11, w: statW - 80 })
      T(`+${fmt(bestMonth.balance)}`, M + 14, statY + 20, { color: C.teal, bold: true, size: 11, w: statW - 20, align: 'right' })
    }
    if (worstMonth) {
      const wx = M + statW + 20
      fill(wx, statY, statW, 44, C.redL, 6); fill(wx, statY, 4, 44, C.red, 0)
      T('Mois le plus chargé', wx + 14, statY + 8, { color: C.red, bold: true, size: 8, w: statW - 20 })
      T(MONTHS_FR[worstMonth.month - 1], wx + 14, statY + 20, { color: C.text, bold: true, size: 11, w: statW - 80 })
      T(fmt(worstMonth.totalExpenses), wx + 14, statY + 20, { color: C.red, bold: true, size: 11, w: statW - 20, align: 'right' })
    }

    // TABLEAU MENSUEL
    let y = statY + 44 + 22
    fill(M, y, PW - M * 2, 24, C.purple, 6)
    T('Détail mensuel', M + 12, y + 7, { color: C.white, bold: true, size: 11, w: PW - M * 2 })
    y += 34

    const cols = [
      { label: 'Mois',         w: 72,  align: 'left'  },
      { label: 'Revenus',      w: 100, align: 'right' },
      { label: 'Dépenses',     w: 100, align: 'right' },
      { label: 'Solde',        w: 90,  align: 'right' },
      { label: 'Taux épargne', w: 72,  align: 'right' },
      { label: 'Répartition',  w: 81,  align: 'left'  },
    ]
    fill(M, y, PW - M * 2, 20, C.rowAlt, 0); hLine(y, C.border)
    let cx2 = M + 10
    cols.forEach(col => { T(col.label, cx2, y + 6, { color: C.muted, bold: true, size: 8, w: col.w, align: col.align }); cx2 += col.w })
    y += 20; hLine(y, C.border)

    const maxVal = Math.max(...months.map(m => Math.max(m.totalIncomes, m.totalExpenses)), 1)
    months.forEach((m, idx) => {
      if (y > 760) {
        doc.addPage(); y = M
        fill(0, 0, PW, 28, C.purple)
        T(`Bilan Annuel ${year} — suite`, M, 9, { color: C.white, bold: true, size: 11, w: 300 })
        y = 36
      }
      const rowH    = 22
      const isEmpty = m.totalIncomes === 0 && m.totalExpenses === 0
      const sr      = m.totalIncomes > 0 ? Math.round((m.balance / m.totalIncomes) * 100) : 0
      const isPos   = m.balance >= 0
      fill(M, y, PW - M * 2, rowH, isEmpty ? '#FAFAFA' : idx % 2 === 0 ? C.rowAlt : C.white, 0)
      let rx = M + 10; const rowY = y + 7
      T(MONTHS_FR[m.month - 1], rx, rowY, { color: isEmpty ? C.muted : C.text, bold: !isEmpty, size: 9, w: cols[0].w }); rx += cols[0].w
      T(isEmpty ? '—' : fmt(m.totalIncomes),  rx, rowY, { color: isEmpty ? C.muted : C.teal,   size: 9, w: cols[1].w, align: 'right' }); rx += cols[1].w
      T(isEmpty ? '—' : fmt(m.totalExpenses), rx, rowY, { color: isEmpty ? C.muted : C.red,    size: 9, w: cols[2].w, align: 'right' }); rx += cols[2].w
      T(isEmpty ? '—' : `${isPos ? '+' : ''}${fmt(m.balance)}`, rx, rowY, { color: isEmpty ? C.muted : isPos ? C.green : C.danger, bold: !isEmpty, size: 9, w: cols[3].w, align: 'right' }); rx += cols[3].w
      T(isEmpty ? '—' : `${sr} %`, rx, rowY, { color: isEmpty ? C.muted : sr >= 20 ? C.teal : sr >= 0 ? C.amber : C.red, size: 9, w: cols[4].w, align: 'right' }); rx += cols[4].w
      if (!isEmpty) {
        const bw = cols[5].w - 10
        bar(rx, rowY,     bw, 4, m.totalIncomes  / maxVal, C.teal, '#D8F5EC')
        bar(rx, rowY + 6, bw, 4, m.totalExpenses / maxVal, C.red,  '#F5D8D8')
      }
      hLine(y + rowH, C.border, 0.3); y += rowH
    })

    // TOTAL
    y += 4; hLine(y, C.purple, 1); y += 6
    fill(M, y, PW - M * 2, 26, C.purpleL, 4)
    let tx = M + 10
    T('TOTAL ANNUEL', tx, y + 8, { color: C.purple, bold: true, size: 10, w: cols[0].w }); tx += cols[0].w
    T(fmt(totalInc), tx, y + 8, { color: C.teal,  bold: true, size: 10, w: cols[1].w, align: 'right' }); tx += cols[1].w
    T(fmt(totalExp), tx, y + 8, { color: C.red,   bold: true, size: 10, w: cols[2].w, align: 'right' }); tx += cols[2].w
    T(`${balance >= 0 ? '+' : ''}${fmt(balance)}`, tx, y + 8, { color: balance >= 0 ? C.green : C.danger, bold: true, size: 10, w: cols[3].w, align: 'right' }); tx += cols[3].w
    T(`${saving} %`, tx, y + 8, { color: C.purple, bold: true, size: 10, w: cols[4].w, align: 'right' })

    // SIGNATURE (seulement si showSignature)
    if (showSignature) {
      y += 40
      if (y + 72 > 810) { doc.addPage(); y = M }
      drawSignature(doc, M, y, PW, M, currency, year, isTrial)
    }

    // FOOTER
    doc.flushPages()
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      if (showSignature) drawWatermark(doc, PW, PH)
      drawTrialBanner(doc, PW, showSignature)
      fill(0, PH - 28, PW, 28, C.purple)
      doc.fillColor('#AFA9EC').font('Helvetica').fontSize(7)
         .text(`Depenzo  ·  Bilan Annuel ${year}  ·  ${currency}  ·  Page ${i + 1} / ${pageCount}`,
           M, PH - 17, { width: PW - M * 2, align: 'center', lineBreak: false })
      if (showSignature) {
        doc.fillColor('#7F77DD').font('Helvetica').fontSize(6)
           .text('Rapport généré avec Depenzo — depenzo.mg',
             M, PH - 8, { width: PW - M * 2, align: 'center', lineBreak: false })
      }
    }
    doc.end()
  } catch (e) {
    console.error('PDF annuel error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
  }
})

// ── GET /export/excel ─────────────────────────────────────────────
router.get('/export/excel', async (req, res) => {
  const { month, year, orgId } = req.query
  try {
    const { currency, convert } = await getUserCurrency(req.user.id)
    const numFmt = excelNumFmt(currency)
    const sym    = CURRENCY_SYMBOLS[currency] || currency
    const userIds = orgId ? await getOrgMemberIds(req.user.id, orgId) : [req.user.id]
    const where   = { userId: { in: userIds } }

    const [expenses, incomes, allRecurExp, allRecurInc] = await Promise.all([
      prisma.expense.findMany({ where: { ...where, date: dateRange(month, year) }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.income.findMany({  where: { ...where, date: dateRange(month, year) }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.recurringExpense.findMany({ where }),
      prisma.recurringIncome.findMany({  where }),
    ])

    const generatedRecurExp = expenses.filter(e => e.recurringExpenseId != null).reduce((s, e) => s + Number(e.amount), 0)
    const generatedRecurInc = incomes.filter(i => i.recurringIncomeId  != null).reduce((s, i) => s + Number(i.amount), 0)
    const recurExp    = generatedRecurExp > 0 ? generatedRecurExp : estimateRecurring(allRecurExp, month, year)
    const recurInc    = generatedRecurInc > 0 ? generatedRecurInc : estimateRecurring(allRecurInc, month, year)
    const punctualExp = expenses.reduce((s, e) => s + Number(e.amount), 0) - generatedRecurExp
    const punctualInc = incomes.reduce((s, i)  => s + Number(i.amount), 0) - generatedRecurInc
    const totalExp    = convert(punctualExp + recurExp)
    const totalInc    = convert(punctualInc + recurInc)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Depenzo'; wb.created = new Date()

    const hFill  = hex => ({ type: 'pattern', pattern: 'solid', fgColor: { argb: hex } })
    const hFont  = (hex = 'FFFFFF', bold = true, sz = 10) => ({ bold, color: { argb: hex }, size: sz })
    const border = { style: 'thin', color: { argb: 'FFD0D0D0' } }
    const allBdr = { top: border, left: border, bottom: border, right: border }
    const rAlign = { horizontal: 'right',  vertical: 'middle' }
    const lAlign = { horizontal: 'left',   vertical: 'middle' }
    const cAlign = { horizontal: 'center', vertical: 'middle' }

    // Résumé
    const wsS = wb.addWorksheet('Résumé', { tabColor: { argb: 'FF444444' } })
    wsS.columns = [{ key: 'l', width: 34 }, { key: 'v', width: 22 }]
    wsS.mergeCells('A1:B1')
    const t = wsS.getCell('A1')
    t.value = `Relevé Financier — ${MONTHS_FR[Number(month) - 1]} ${year}  (${currency})`
    t.font = { bold: true, size: 14 }; t.alignment = cAlign; wsS.getRow(1).height = 28
    wsS.addRow([])

    const sRow = (label, value, bold = false, bg = null) => {
      wsS.addRow({ l: label, v: value }); const r = wsS.lastRow; r.height = 18
      r.getCell(1).font = { bold, size: 10 }; r.getCell(1).alignment = lAlign; r.getCell(1).border = allBdr
      r.getCell(2).value = value; r.getCell(2).numFmt = numFmt
      r.getCell(2).font  = { bold, size: 10 }; r.getCell(2).alignment = rAlign; r.getCell(2).border = allBdr
      if (bg) { r.getCell(1).fill = hFill(bg); r.getCell(2).fill = hFill(bg) }
    }

    wsS.addRow({ l: 'REVENUS', v: '' }); wsS.lastRow.getCell(1).font = { bold: true, size: 11 }; wsS.lastRow.height = 20
    sRow('  Ponctuels',   convert(punctualInc))
    sRow('  Récurrents',  convert(recurInc))
    sRow('TOTAL REVENUS', totalInc, true, 'FFE8F5E9')
    wsS.addRow([])
    wsS.addRow({ l: 'DÉPENSES', v: '' }); wsS.lastRow.getCell(1).font = { bold: true, size: 11 }; wsS.lastRow.height = 20
    sRow('  Ponctuelles',  convert(punctualExp))
    sRow('  Récurrentes',  convert(recurExp))
    sRow('TOTAL DÉPENSES', totalExp, true, 'FFFCE4E4')
    wsS.addRow([])
    sRow('SOLDE NET', totalInc - totalExp, true, totalInc - totalExp >= 0 ? 'FFE8F5E9' : 'FFFCE4E4')

    const addSheet = (name, tabColor, rows, totalVal) => {
      const ws = wb.addWorksheet(name, { tabColor: { argb: tabColor } })
      ws.columns = [
        { key: 'date',     width: 14 },
        { key: 'category', width: 20 },
        { key: 'desc',     width: 34 },
        { key: 'type',     width: 14 },
        { key: 'amount',   width: 22 },
      ]
      ws.addRow(['Date', 'Catégorie', 'Description', 'Type', `Montant (${sym})`])
      const h = ws.lastRow; h.height = 20
      h.eachCell(c => { c.fill = hFill(tabColor); c.font = hFont(); c.border = allBdr; c.alignment = cAlign })
      h.getCell(5).alignment = rAlign

      rows.forEach((r, i) => {
        ws.addRow({
          date:     new Date(r.date).toLocaleDateString('fr-FR'),
          category: r.category?.name || '—',
          desc:     r.description || '—',
          type:     r.isRecurring ? 'Récurrent' : 'Ponctuel',
          amount:   convert(Number(r.amount)),
        })
        const dr = ws.lastRow; dr.height = 17
        const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9F9F9'
        dr.eachCell(c => { c.fill = hFill(bg); c.font = { size: 10 }; c.border = allBdr })
        dr.getCell(4).font = { size: 10, color: { argb: r.isRecurring ? 'FF6C5CE7' : 'FF888888' } }
        dr.getCell(5).numFmt = numFmt; dr.getCell(5).font = { bold: true, size: 10 }; dr.getCell(5).alignment = rAlign
      })
      ws.addRow(['', '', '', 'TOTAL', totalVal]); const tr = ws.lastRow; tr.height = 20
      tr.getCell(4).font = hFont('FF000000', true, 11); tr.getCell(4).fill = hFill('FFF0F0F0'); tr.getCell(4).border = allBdr; tr.getCell(4).alignment = cAlign
      tr.getCell(5).numFmt = numFmt; tr.getCell(5).font = { bold: true, size: 11 }; tr.getCell(5).fill = hFill('FFF0F0F0'); tr.getCell(5).alignment = rAlign; tr.getCell(5).border = allBdr
    }

    addSheet('Revenus',  'FF2E7D32', incomes,  totalInc)
    addSheet('Dépenses', 'FFC62828', expenses, totalExp)

    res.setHeader('Content-Disposition', `attachment; filename=rapport-${year}-${String(month).padStart(2,'0')}.xlsx`)
    await wb.xlsx.write(res); res.end()
  } catch (e) {
    console.error('Excel error:', e)
    if (!res.headersSent) res.status(500).json({ error: e.message })
  }
})

module.exports = router
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

const CURRENCY_SYMBOLS = {
  MGA: 'Ar', EUR: '€',  USD: '$',  GBP: '£',
  CHF: 'Fr', JPY: '¥',  CAD: 'CA$', MAD: 'MAD',
  XOF: 'CFA', MUR: 'Rs', CNY: 'CNY',
}
const PREFIX_CURRENCIES = new Set(['EUR','USD','GBP','CHF','CAD'])
const NO_DECIMAL        = new Set(['JPY','MGA','XOF'])

function fmtCurrency(amount, currency = 'MGA') {
  const n      = Number(amount || 0)
  const sym    = CURRENCY_SYMBOLS[currency] || currency
  const noDecim = NO_DECIMAL.has(currency)
  const num    = noDecim
    ? Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    : n.toLocaleString('fr-FR', { minimumFractionDigits:2, maximumFractionDigits:2 })
  return PREFIX_CURRENCIES.has(currency) ? `${sym}${num}` : `${num} ${sym}`
}

function excelNumFmt(currency = 'MGA') {
  const sym     = CURRENCY_SYMBOLS[currency] || currency
  const noDecim = NO_DECIMAL.has(currency)
  const dec     = noDecim ? '0' : '0.00'
  return PREFIX_CURRENCIES.has(currency) ? `"${sym}"#,##${dec}` : `#,##${dec} "${sym}"`
}

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
  const convert = (amount) => Number(amount || 0) * conversionRate
  return { currency, defaultCurrency, convert }
}

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

// ── Helper : récupérer les userIds selon orgId ────────────────────
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

// ── Helper totaux d'un mois (supporte plusieurs userIds) ──────────
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
    expenses: totalExpenses, incomes: totalIncomes,
    balance:           totalIncomes - totalExpenses,
    punctualExpenses:  punctualExp,
    recurringExpenses: genRecurExp + estRecurExp,
    punctualIncomes:   punctualInc,
    recurringIncomes:  genRecurInc + estRecurInc,
    isExpEstimated:    estRecurExp > 0,
    isIncEstimated:    estRecurInc > 0,
  }
}

// ── GET /summary ──────────────────────────────────────────────────
router.get('/summary', async (req, res) => {
  const { month, year, orgId } = req.query
  const dr = dateRange(month, year)
  try {
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]
    const where = { userId: { in: userIds } }

    const [
      expAgg, incAgg, byCat,
      punctualExpAgg, recurringExpAgg,
      punctualIncAgg, recurringIncAgg,
      allRecurExp, allRecurInc,
    ] = await prisma.$transaction([
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
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    const result = await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(async m => {
        const dr    = dateRange(m, year)
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
        const punctualExp = Number(expAgg._sum.amount || 0) - Number(recurExpAgg._sum.amount || 0)
        const genRecurExp = Number(recurExpAgg._sum.amount || 0)
        const estRecurExp = genRecurExp === 0 ? estimateRecurring(allRecurExp, m, year) : 0
        const totalExp    = punctualExp + genRecurExp + estRecurExp
        const punctualInc = Number(incAgg._sum.amount || 0) - Number(recurIncAgg._sum.amount || 0)
        const genRecurInc = Number(recurIncAgg._sum.amount || 0)
        const estRecurInc = genRecurInc === 0 ? estimateRecurring(allRecurInc, m, year) : 0
        const totalInc    = punctualInc + genRecurInc + estRecurInc
        return {
          month: m, expenses: totalExp, incomes: totalInc,
          totalExpenses: totalExp, totalIncomes: totalInc,
          balance: totalInc - totalExp,
          punctualExpenses: punctualExp, recurringExpenses: genRecurExp + estRecurExp,
          punctualIncomes: punctualInc,  recurringIncomes:  genRecurInc + estRecurInc,
        }
      })
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
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    const months = Array.from({ length: 12 }, (_, i) => {
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
    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    const months    = await Promise.all(Array.from({ length: 12 }, (_, i) => i + 1).map(m => getMonthTotals(userIds, m, year)))
    const totalIncomes  = months.reduce((s, m) => s + m.totalIncomes,  0)
    const totalExpenses = months.reduce((s, m) => s + m.totalExpenses, 0)
    const balance       = totalIncomes - totalExpenses
    const savingRate    = totalIncomes > 0 ? Math.round((balance / totalIncomes) * 100) : 0
    const bestMonth     = months.reduce((a, b) => b.balance > a.balance ? b : a, months[0])
    const worstMonth    = months.reduce((a, b) => b.totalExpenses > a.totalExpenses ? b : a, months[0])
    res.json({
      year: Number(year), months: months.map(m => ({ ...m, label: MONTHS_FR[m.month - 1].slice(0, 3) })),
      totalIncomes, totalExpenses, balance, savingRate,
      bestMonth:  { ...bestMonth,  label: MONTHS_FR[bestMonth.month  - 1] },
      worstMonth: { ...worstMonth, label: MONTHS_FR[worstMonth.month - 1] },
    })
  } catch (e) {
    if (e.status) return res.status(e.status).json({ error: e.message })
    res.status(500).json({ error: e.message })
  }
})

// ── GET /export/pdf ───────────────────────────────────────────────
router.get('/export/pdf', async (req, res) => {
  const { month, year, orgId } = req.query
  try {
    const { currency, convert } = await getUserCurrency(req.user.id)
    const fmt = n => fmtCurrency(convert(n), currency)
    const sym = CURRENCY_SYMBOLS[currency] || currency

    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]
    const where = { userId: { in: userIds } }

    const daysInMonth = new Date(year, month, 0).getDate()
    const workingDays = Math.round(daysInMonth * 5 / 7)
    const mStart = new Date(Number(year), Number(month) - 1, 1)
    const mEnd   = new Date(Number(year), Number(month), 0)

    const filterActive = list => list.filter(r => {
      if (!r.isActive) return false
      const start = new Date(r.startDate), end = r.endDate ? new Date(r.endDate) : null
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
      prisma.expense.findMany({ where: { ...where, date: dateRange(month, year) }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.income.findMany({  where: { ...where, date: dateRange(month, year) }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.recurringExpense.findMany({ where }),
      prisma.recurringIncome.findMany({  where }),
    ])

    const activeRecurExp    = filterActive(allRecurExp)
    const activeRecurInc    = filterActive(allRecurInc)
    const generatedRecurExp = expenses.filter(e => e.recurringExpenseId != null).reduce((s,e) => s + Number(e.amount), 0)
    const generatedRecurInc = incomes.filter(i => i.recurringIncomeId  != null).reduce((s,i) => s + Number(i.amount), 0)
    const recurExp    = generatedRecurExp > 0 ? generatedRecurExp : estimateRec(activeRecurExp)
    const recurInc    = generatedRecurInc > 0 ? generatedRecurInc : estimateRec(activeRecurInc)
    const punctualExp = expenses.reduce((s,e) => s + Number(e.amount), 0) - generatedRecurExp
    const punctualInc = incomes.reduce((s,i)  => s + Number(i.amount), 0) - generatedRecurInc
    const totalExpFull = punctualExp + recurExp
    const totalIncFull = punctualInc + recurInc
    const balance      = totalIncFull - totalExpFull
    const savingPct    = totalIncFull > 0 ? Math.round((balance / totalIncFull) * 100) : 0

    const doc     = new PDFDoc({ margin:50, size:'A4', bufferPages:true })
    const genDate = new Date().toLocaleDateString('fr-FR')
    const lastDay = new Date(year, month, 0).getDate()
    const PW=495, L=50

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${year}-${String(month).padStart(2,'0')}.pdf`)
    doc.pipe(res)

    const hLine = (y, lw=0.5, color='#000') => doc.moveTo(L,y).lineTo(L+PW,y).lineWidth(lw).strokeColor(color).stroke()
    const T     = (text, x, y, opts={}) =>
      doc.fillColor(opts.color||'#000').font(opts.bold?'Helvetica-Bold':'Helvetica')
         .fontSize(opts.size||9).text(String(text), x, y, { width:opts.w||200, align:opts.align||'left', lineBreak:false })

    T('RELEVE FINANCIER', L, 50, { bold:true, size:16, w:PW })
    T(`${MONTHS_FR[Number(month)-1]} ${year}  —  Devise : ${currency}`, L, 70, { size:10, w:PW })
    T(`Emis le : ${genDate}`, L, 50, { size:8, w:PW, align:'right', color:'#555' })
    T(`Periode : 01/${String(month).padStart(2,'0')}/${year} - ${lastDay}/${String(month).padStart(2,'0')}/${year}`, L, 62, { size:8, w:PW, align:'right', color:'#555' })
    doc.y = 90; hLine(doc.y, 1); doc.y += 16

    const cardW=150, cardH=90, cardY=doc.y, gap=(PW-cardW*3)/2
    const cards = [
      { x:L,               title:'REVENUS',   main:totalIncFull, sub1:`Ponctuel : ${fmt(punctualInc)}`, sub2:`Recurent : ${fmt(recurInc)}`  },
      { x:L+cardW+gap,     title:'DEPENSES',  main:totalExpFull, sub1:`Ponctuel : ${fmt(punctualExp)}`, sub2:`Recurent : ${fmt(recurExp)}`  },
      { x:L+(cardW+gap)*2, title:'SOLDE NET', main:balance,      sub1:`Taux epargne : ${savingPct} %`,  sub2:`Devise : ${currency}`          },
    ]
    cards.forEach(c => {
      doc.rect(c.x, cardY, cardW, cardH).lineWidth(0.5).strokeColor('#000').stroke()
      doc.rect(c.x, cardY, cardW, 3).fill('#000').fillColor('#000')
      T(c.title, c.x+8, cardY+9, { bold:true, size:8, w:cardW-16 })
      const sign = c.title==='SOLDE NET' ? (c.main>=0?'+':'-') : ''
      T(`${sign}${fmt(Math.abs(c.main))}`, c.x+8, cardY+23, { bold:true, size:11, w:cardW-16 })
      doc.moveTo(c.x+8, cardY+52).lineTo(c.x+cardW-8, cardY+52).lineWidth(0.3).strokeColor('#aaa').stroke()
      T(c.sub1, c.x+8, cardY+57, { size:7, w:cardW-16, color:'#444' })
      T(c.sub2, c.x+8, cardY+70, { size:7, w:cardW-16, color:'#444' })
    })
    doc.y = cardY + cardH + 20; hLine(doc.y, 1); doc.y += 20

    const newPageIfNeeded = () => { if (doc.y > 750) { doc.addPage(); doc.y = 50 } }
    const sectionTitle = (label, total) => {
      newPageIfNeeded()
      T(label, L, doc.y, { bold:true, size:11, w:PW-120 })
      T(fmt(total), L, doc.y, { bold:true, size:11, w:PW, align:'right' })
      doc.y += 14; hLine(doc.y, 0.5); doc.y += 8
    }
    const itemRow = (desc, amount, sign, isRecurring) => {
      newPageIfNeeded()
      T(`${isRecurring?'~ ':'* '}${desc}`, L+10, doc.y, { size:9, w:PW-120 })
      T(`${sign}${fmt(amount)}`, L, doc.y, { size:9, w:PW, align:'right' })
      doc.y += 14
    }

    sectionTitle('Revenus', totalIncFull)
    if (!incomes.length) { T('Aucun revenu ce mois', L+10, doc.y, { size:9, color:'#888', w:PW }); doc.y += 14 }
    else incomes.forEach(r => itemRow([r.description, r.category?.name].filter(Boolean).join(' - ')||'-', r.amount, '+', r.isRecurring))
    doc.y += 4; T(`Ponctuel : ${fmt(punctualInc)}   Recurent : ${fmt(recurInc)}`, L+10, doc.y, { size:8, color:'#555', w:PW }); doc.y += 18
    hLine(doc.y, 0.3, '#999'); doc.y += 16

    sectionTitle('Depenses', totalExpFull)
    if (!expenses.length) { T('Aucune depense ce mois', L+10, doc.y, { size:9, color:'#888', w:PW }); doc.y += 14 }
    else expenses.forEach(r => itemRow([r.description, r.category?.name].filter(Boolean).join(' - ')||'-', r.amount, '-', r.isRecurring))
    doc.y += 4; T(`Ponctuel : ${fmt(punctualExp)}   Recurent : ${fmt(recurExp)}`, L+10, doc.y, { size:8, color:'#555', w:PW }); doc.y += 18
    hLine(doc.y, 1); doc.y += 10

    newPageIfNeeded()
    T('SOLDE NET', L, doc.y, { bold:true, size:11, w:PW-120 })
    T(`${balance>=0?'+':''}${fmt(balance)}`, L, doc.y, { bold:true, size:11, w:PW, align:'right' })
    doc.y += 14; T(`Taux d'epargne : ${savingPct} %`, L+10, doc.y, { size:8, color:'#555', w:PW }); doc.y += 16
    hLine(doc.y, 1)

    doc.flushPages()
    const pageCount = doc.bufferedPageRange().count
    for (let i=0; i<pageCount; i++) {
      doc.switchToPage(i); hLine(822, 0.4, '#aaa')
      doc.fillColor('#888').font('Helvetica').fontSize(7)
         .text(`Expense Tracker  -  ${MONTHS_FR[Number(month)-1]} ${year}  (${currency})  -  Page ${i+1}/${pageCount}`, L, 830, { width:PW, align:'center', lineBreak:false })
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
  try {
    const { currency, convert } = await getUserCurrency(req.user.id)
    const fmt = n => fmtCurrency(convert(n), currency)

    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]

    const months   = await Promise.all(Array.from({ length: 12 }, (_, i) => i + 1).map(m => getMonthTotals(userIds, m, year)))
    const totalInc = months.reduce((s, m) => s + m.totalIncomes,  0)
    const totalExp = months.reduce((s, m) => s + m.totalExpenses, 0)
    const balance  = totalInc - totalExp
    const saving   = totalInc > 0 ? Math.round((balance / totalInc) * 100) : 0

    const doc = new PDFDoc({ margin:50, size:'A4', bufferPages:true })
    const PW=495, L=50

    const hLine = (y, lw=0.5, color='#000') => doc.moveTo(L,y).lineTo(L+PW,y).lineWidth(lw).strokeColor(color).stroke()
    const T     = (text, x, y, opts={}) =>
      doc.fillColor(opts.color||'#000').font(opts.bold?'Helvetica-Bold':'Helvetica')
         .fontSize(opts.size||9).text(String(text), x, y, { width:opts.w||200, align:opts.align||'left', lineBreak:false })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename=rapport-annuel-${year}.pdf`)
    doc.pipe(res)

    T(`BILAN ANNUEL ${year}`, L, 50, { bold:true, size:18, w:PW })
    T(`Devise : ${currency}`, L, 72, { size:9, w:PW, color:'#555' })
    T(`Emis le : ${new Date().toLocaleDateString('fr-FR')}`, L, 54, { size:8, w:PW, align:'right', color:'#555' })
    doc.y = 86; hLine(doc.y, 1); doc.y += 16

    const cardW=150, cardH=80, cardY=doc.y, gap=(PW-cardW*3)/2
    ;[
      { title:'REVENUS ANNUELS',  main:totalInc },
      { title:'DEPENSES ANNUELS', main:totalExp },
      { title:'EPARGNE NETTE',    main:balance, extra:`Taux : ${saving} %` },
    ].forEach((c, i) => {
      const x = L + i * (cardW + gap)
      doc.rect(x, cardY, cardW, cardH).lineWidth(0.5).strokeColor('#000').stroke()
      doc.rect(x, cardY, cardW, 3).fill('#000').fillColor('#000')
      T(c.title, x+8, cardY+9, { bold:true, size:7, w:cardW-16 })
      T(fmt(Math.abs(c.main)), x+8, cardY+22, { bold:true, size:11, w:cardW-16 })
      if (c.extra) T(c.extra, x+8, cardY+55, { size:8, color:'#555', w:cardW-16 })
    })
    doc.y = cardY + cardH + 20; hLine(doc.y, 1); doc.y += 14

    T('Detail mensuel', L, doc.y, { bold:true, size:12, w:PW }); doc.y += 14
    hLine(doc.y, 0.5); doc.y += 8

    const colW = [70, 120, 120, 90, 95]
    ;['Mois','Revenus','Depenses','Solde','Taux epargne'].forEach((h, i) => {
      T(h, L + colW.slice(0,i).reduce((a,b)=>a+b,0), doc.y, { bold:true, size:9, w:colW[i], align:i>0?'right':'left' })
    })
    doc.y += 14; hLine(doc.y, 0.3, '#999'); doc.y += 6

    months.forEach((m, idx) => {
      if (doc.y > 750) { doc.addPage(); doc.y = 50 }
      if (idx%2===0) doc.rect(L, doc.y-2, PW, 16).fill('#f9f9f9').fillColor('#000')
      const sr  = m.totalIncomes > 0 ? Math.round((m.balance/m.totalIncomes)*100) : 0
      const row = [MONTHS_FR[m.month-1], fmt(m.totalIncomes), fmt(m.totalExpenses), `${m.balance>=0?'+':''}${fmt(m.balance)}`, `${sr} %`]
      row.forEach((v, i) => {
        const x = L + colW.slice(0,i).reduce((a,b)=>a+b,0)
        const color = i===3 ? (m.balance>=0?'#00b894':'#e74c3c') : '#000'
        T(v, x, doc.y, { size:9, w:colW[i], align:i>0?'right':'left', color })
      })
      doc.y += 16
    })

    doc.y += 6; hLine(doc.y, 1); doc.y += 10
    T('TOTAL', L, doc.y, { bold:true, size:10, w:colW[0] })
    T(fmt(totalInc), L+colW[0],              doc.y, { bold:true, size:10, w:colW[1], align:'right' })
    T(fmt(totalExp), L+colW[0]+colW[1],      doc.y, { bold:true, size:10, w:colW[2], align:'right' })
    T(`${balance>=0?'+':''}${fmt(balance)}`,  L+colW[0]+colW[1]+colW[2],        doc.y, { bold:true, size:10, w:colW[3], align:'right', color:balance>=0?'#00b894':'#e74c3c' })
    T(`${saving} %`,                          L+colW[0]+colW[1]+colW[2]+colW[3], doc.y, { bold:true, size:10, w:colW[4], align:'right' })

    doc.flushPages()
    const pageCount = doc.bufferedPageRange().count
    for (let i=0; i<pageCount; i++) {
      doc.switchToPage(i); hLine(822, 0.4, '#aaa')
      doc.fillColor('#888').font('Helvetica').fontSize(7)
         .text(`Expense Tracker  -  Bilan Annuel ${year}  (${currency})  -  Page ${i+1}/${pageCount}`, L, 830, { width:PW, align:'center', lineBreak:false })
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

    const userIds = orgId
      ? await getOrgMemberIds(req.user.id, orgId)
      : [req.user.id]
    const where = { userId: { in: userIds } }

    const [expenses, incomes, allRecurExp, allRecurInc] = await Promise.all([
      prisma.expense.findMany({ where: { ...where, date: dateRange(month, year) }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.income.findMany({  where: { ...where, date: dateRange(month, year) }, include: { category: { select: { name: true } } }, orderBy: { date: 'asc' } }),
      prisma.recurringExpense.findMany({ where }),
      prisma.recurringIncome.findMany({  where }),
    ])

    const generatedRecurExp = expenses.filter(e => e.recurringExpenseId != null).reduce((s,e) => s + Number(e.amount), 0)
    const generatedRecurInc = incomes.filter(i => i.recurringIncomeId  != null).reduce((s,i) => s + Number(i.amount), 0)
    const recurExp    = generatedRecurExp > 0 ? generatedRecurExp : estimateRecurring(allRecurExp, month, year)
    const recurInc    = generatedRecurInc > 0 ? generatedRecurInc : estimateRecurring(allRecurInc, month, year)
    const punctualExp = expenses.reduce((s,e) => s + Number(e.amount), 0) - generatedRecurExp
    const punctualInc = incomes.reduce((s,i)  => s + Number(i.amount), 0) - generatedRecurInc
    const totalExp    = convert(punctualExp + recurExp)
    const totalInc    = convert(punctualInc + recurInc)
    const cPunctualExp = convert(punctualExp)
    const cRecurExp    = convert(recurExp)
    const cPunctualInc = convert(punctualInc)
    const cRecurInc    = convert(recurInc)

    const wb = new ExcelJS.Workbook()
    wb.creator = 'Expense Tracker'; wb.created = new Date()

    const hFill  = hex => ({ type:'pattern', pattern:'solid', fgColor:{ argb:hex } })
    const hFont  = (hex='FFFFFF', bold=true, sz=10) => ({ bold, color:{ argb:hex }, size:sz })
    const border = { style:'thin', color:{ argb:'FFD0D0D0' } }
    const allBdr = { top:border, left:border, bottom:border, right:border }
    const rAlign = { horizontal:'right',  vertical:'middle' }
    const lAlign = { horizontal:'left',   vertical:'middle' }
    const cAlign = { horizontal:'center', vertical:'middle' }

    const wsS = wb.addWorksheet('Résumé', { tabColor:{ argb:'FF444444' } })
    wsS.columns = [{ key:'l', width:34 }, { key:'v', width:22 }]
    wsS.mergeCells('A1:B1')
    const t = wsS.getCell('A1')
    t.value = `Relevé Financier — ${MONTHS_FR[Number(month)-1]} ${year}  (${currency})`
    t.font = { bold:true, size:14 }; t.alignment = cAlign; wsS.getRow(1).height = 28
    wsS.addRow([])

    const sRow = (label, value, bold=false, bg=null) => {
      wsS.addRow({ l:label, v:value }); const r=wsS.lastRow; r.height=18
      r.getCell(1).font={bold,size:10}; r.getCell(1).alignment=lAlign; r.getCell(1).border=allBdr
      r.getCell(2).value=value; r.getCell(2).numFmt=numFmt
      r.getCell(2).font={bold,size:10}; r.getCell(2).alignment=rAlign; r.getCell(2).border=allBdr
      if (bg) { r.getCell(1).fill=hFill(bg); r.getCell(2).fill=hFill(bg) }
    }
    wsS.addRow({ l:'REVENUS', v:'' }); wsS.lastRow.getCell(1).font={bold:true,size:11}; wsS.lastRow.height=20
    sRow('  Ponctuels', cPunctualInc); sRow('  Récurrents', cRecurInc); sRow('TOTAL REVENUS', totalInc, true, 'FFE8F5E9')
    wsS.addRow([])
    wsS.addRow({ l:'DÉPENSES', v:'' }); wsS.lastRow.getCell(1).font={bold:true,size:11}; wsS.lastRow.height=20
    sRow('  Ponctuelles', cPunctualExp); sRow('  Récurrentes', cRecurExp); sRow('TOTAL DÉPENSES', totalExp, true, 'FFFCE4E4')
    wsS.addRow([]); sRow('SOLDE NET', totalInc-totalExp, true, totalInc-totalExp>=0?'FFE8F5E9':'FFFCE4E4')

    const addSheet = (name, tabColor, rows, totalVal) => {
      const ws = wb.addWorksheet(name, { tabColor:{ argb:tabColor } })
      ws.columns = [{ key:'date', width:14 }, { key:'category', width:20 }, { key:'desc', width:34 }, { key:'type', width:14 }, { key:'amount', width:22 }]
      ws.addRow(['Date','Catégorie','Description','Type',`Montant (${sym})`])
      const h=ws.lastRow; h.height=20
      h.eachCell(c => { c.fill=hFill(tabColor); c.font=hFont(); c.border=allBdr; c.alignment=cAlign })
      h.getCell(5).alignment=rAlign
      rows.forEach((r,i) => {
        ws.addRow({ date:new Date(r.date).toLocaleDateString('fr-FR'), category:r.category?.name||'-', desc:r.description||'-', type:r.isRecurring?'Récurrent':'Ponctuel', amount:convert(Number(r.amount)) })
        const dr=ws.lastRow; dr.height=17
        const bg=i%2===0?'FFFFFFFF':'FFF9F9F9'
        dr.eachCell(c => { c.fill=hFill(bg); c.font={size:10}; c.border=allBdr })
        dr.getCell(4).font={size:10,color:{argb:r.isRecurring?'FF6C5CE7':'FF888888'}}
        dr.getCell(5).numFmt=numFmt
        dr.getCell(5).font={bold:true,size:10}; dr.getCell(5).alignment=rAlign
      })
      ws.addRow(['','','','TOTAL',totalVal]); const tr=ws.lastRow; tr.height=20
      tr.getCell(4).font=hFont('FF000000',true,11); tr.getCell(4).fill=hFill('FFF0F0F0'); tr.getCell(4).border=allBdr; tr.getCell(4).alignment=cAlign
      tr.getCell(5).numFmt=numFmt; tr.getCell(5).font={bold:true,size:11}; tr.getCell(5).fill=hFill('FFF0F0F0'); tr.getCell(5).alignment=rAlign; tr.getCell(5).border=allBdr
    }
    addSheet('Revenus',  'FF2E7D32', incomes,  totalInc)
    addSheet('Dépenses', 'FFC62828', expenses, totalExp)
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${year}-${String(month).padStart(2,'0')}.xlsx`)
    await wb.xlsx.write(res); res.end()
  } catch (e) {
    console.error('Excel error:', e)
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
const router  = require('express').Router()
const prisma  = require('../config/prisma')
const auth    = require('../middleware/auth')
const PDFDoc  = require('pdfkit')
const ExcelJS = require('exceljs')

router.use(auth)

// ── Helper plage de dates ─────────────────────────────────────────
const dateRange = (month, year) => ({
  gte: new Date(Number(year), Number(month) - 1, 1),
  lte: new Date(Number(year), Number(month),     0),
})

// ── GET /api/reports/summary ──────────────────────────────────────
router.get('/summary', async (req, res) => {
  const { month, year } = req.query
  const dr = dateRange(month, year)
  try {
    const [
      expAgg, incAgg, byCat,
      punctualExpAgg, recurringExpAgg,
      punctualIncAgg, recurringIncAgg,
    ] = await prisma.$transaction([
      prisma.expense.aggregate({ where: { userId: req.user.id, date: dr }, _sum: { amount: true } }),
      prisma.income.aggregate(  { where: { userId: req.user.id, date: dr }, _sum: { amount: true } }),
      prisma.expense.groupBy({
        by: ['categoryId'], where: { userId: req.user.id, date: dr },
        _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } },
      }),
      prisma.expense.aggregate({ where: { userId: req.user.id, date: dr, isRecurring: false }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { userId: req.user.id, date: dr, isRecurring: true  }, _sum: { amount: true } }),
      prisma.income.aggregate(  { where: { userId: req.user.id, date: dr, isRecurring: false }, _sum: { amount: true } }),
      prisma.income.aggregate(  { where: { userId: req.user.id, date: dr, isRecurring: true  }, _sum: { amount: true } }),
    ])

    const cats   = await prisma.category.findMany({ where: { id: { in: byCat.map(b => b.categoryId).filter(Boolean) } } })
    const catMap = Object.fromEntries(cats.map(c => [c.id, c]))

    const totalExpenses = Number(expAgg._sum.amount || 0)
    const totalIncomes  = Number(incAgg._sum.amount || 0)

    res.json({
      totalExpenses,
      totalIncomes,
      balance:           totalIncomes - totalExpenses,
      punctualExpenses:  Number(punctualExpAgg._sum.amount  || 0),
      recurringExpenses: Number(recurringExpAgg._sum.amount || 0),
      punctualIncomes:   Number(punctualIncAgg._sum.amount  || 0),
      recurringIncomes:  Number(recurringIncAgg._sum.amount || 0),
      byCategory: byCat.map(b => ({ ...catMap[b.categoryId], total: Number(b._sum.amount) })),
    })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/reports/monthly ──────────────────────────────────────
router.get('/monthly', async (req, res) => {
  const { year } = req.query
  try {
    const result = await Promise.all(
      Array.from({ length: 12 }, (_, i) => i + 1).map(async m => {
        const dr = dateRange(m, year)
        const [e, i] = await prisma.$transaction([
          prisma.expense.aggregate({ where: { userId: req.user.id, date: dr }, _sum: { amount: true } }),
          prisma.income.aggregate(  { where: { userId: req.user.id, date: dr }, _sum: { amount: true } }),
        ])
        return {
          month:    m,
          expenses: Number(e._sum.amount || 0),
          incomes:  Number(i._sum.amount || 0),
          balance:  Number(i._sum.amount || 0) - Number(e._sum.amount || 0),
        }
      })
    )
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/reports/export/pdf ───────────────────────────────────
router.get('/export/pdf', async (req, res) => {
  const { month, year } = req.query
  const MONTHS_FR = ['Janvier','Fevrier','Mars','Avril','Mai','Juin',
                     'Juillet','Aout','Septembre','Octobre','Novembre','Decembre']
  try {
    const daysInMonth = new Date(year, month, 0).getDate()
    const workingDays = Math.round(daysInMonth * 5 / 7)

    const estimateRec = (list) => list.reduce((s, r) => {
      const amt = Number(r.amount)
      if (r.frequency === 'monthly') return s + amt
      if (r.frequency === 'weekly')  return s + amt * 4
      if (r.frequency === 'daily')
        return s + amt * (r.dayType === 'working' ? workingDays : daysInMonth)
      return s
    }, 0)

    const mStart = new Date(Number(year), Number(month) - 1, 1)
    const mEnd   = new Date(Number(year), Number(month), 0)

    const filterActive = list => list.filter(r => {
      if (!r.isActive) return false
      const start = new Date(r.startDate)
      const end   = r.endDate ? new Date(r.endDate) : null
      return start <= mEnd && (!end || end >= mStart)
    })

    const [expenses, incomes, allRecurExp, allRecurInc] = await Promise.all([
      prisma.expense.findMany({
        where:   { userId: req.user.id, date: dateRange(month, year) },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.income.findMany({
        where:   { userId: req.user.id, date: dateRange(month, year) },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.recurringExpense.findMany({
        where:   { userId: req.user.id },
        include: { category: { select: { name: true } } },
      }),
      prisma.recurringIncome.findMany({
        where:   { userId: req.user.id },
        include: { category: { select: { name: true } } },
      }),
    ])

    const activeRecurExp = filterActive(allRecurExp)
    const activeRecurInc = filterActive(allRecurInc)

    const totalExp = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalInc = incomes.reduce((s, i)  => s + Number(i.amount), 0)

    // Récurrents générés ce mois (dans expenses/incomes)
    const generatedRecurExp = expenses.filter(e => e.recurringExpenseId != null).reduce((s,e) => s + Number(e.amount), 0)
    const generatedRecurInc = incomes.filter(i => i.recurringIncomeId  != null).reduce((s,i) => s + Number(i.amount), 0)

    // Si pas encore générés → estimation depuis recurring_expenses
    const recurExp = generatedRecurExp > 0 ? generatedRecurExp : estimateRec(activeRecurExp)
    const recurInc = generatedRecurInc > 0 ? generatedRecurInc : estimateRec(activeRecurInc)

    const punctualExp = totalExp - generatedRecurExp
    const punctualInc = totalInc - generatedRecurInc

    const totalExpFull = punctualExp + recurExp
    const totalIncFull = punctualInc + recurInc
    const balance      = totalIncFull - totalExpFull
    const savingPct    = totalIncFull > 0 ? Math.round((balance / totalIncFull) * 100) : 0

    // Prévision = solde - récurrences non encore générées (estimation simple)
    const prevision   = balance

    const doc     = new PDFDoc({ margin: 50, size: 'A4', bufferPages: true })
    const genDate = new Date().toLocaleDateString('fr-FR')
    const lastDay = new Date(year, month, 0).getDate()
    const PW      = 495  // page width utile
    const L       = 50   // marge gauche

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition',
      `attachment; filename=rapport-${year}-${String(month).padStart(2,'0')}.pdf`)
    doc.pipe(res)

    // ── Formatage nombres ────────────────────────────────────────
    const fmtN = n => Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    const fmtAr = n => `${fmtN(n)} Ar`
    const fmtDate = d => new Date(d).toLocaleDateString('fr-FR',
      { day:'2-digit', month:'2-digit', year:'numeric' })

    // ── Helpers ───────────────────────────────────────────────────
    const hLine = (y, lw = 0.5, color = '#000') =>
      doc.moveTo(L, y).lineTo(L + PW, y).lineWidth(lw).strokeColor(color).stroke()

    const T = (text, x, y, opts = {}) =>
      doc.fillColor(opts.color || '#000')
         .font(opts.bold ? 'Helvetica-Bold' : 'Helvetica')
         .fontSize(opts.size || 9)
         .text(String(text), x, y, {
           width: opts.w || 200,
           align: opts.align || 'left',
           lineBreak: false,
         })

    // ════════════════════════════════════════════════════════════
    // EN-TÊTE
    // ════════════════════════════════════════════════════════════
    T('RELEVE FINANCIER', L, 50, { bold: true, size: 16, w: PW })
    T(`${MONTHS_FR[Number(month)-1]} ${year}`, L, 70, { size: 10, w: PW })
    T(`Emis le : ${genDate}`, L, 50, { size: 8, w: PW, align: 'right', color: '#555' })
    T(`Periode : 01/${String(month).padStart(2,'0')}/${year} - ${lastDay}/${String(month).padStart(2,'0')}/${year}`,
      L, 62, { size: 8, w: PW, align: 'right', color: '#555' })

    doc.y = 90
    hLine(doc.y, 1)
    doc.y += 16

    // ════════════════════════════════════════════════════════════
    // 3 CARDS RÉSUMÉ EN LIGNE
    // ════════════════════════════════════════════════════════════
    const cardW  = 150
    const cardH  = 90
    const cardY  = doc.y
    const gap    = (PW - cardW * 3) / 2
    const cards  = [
      { x: L,                     title: 'REVENUS',   main: totalIncFull,  sub1: `Ponctuel : ${fmtAr(punctualInc)}`, sub2: `Recurent : ${fmtAr(recurInc)}` },
      { x: L + cardW + gap,       title: 'DEPENSES',  main: totalExpFull,  sub1: `Ponctuel : ${fmtAr(punctualExp)}`, sub2: `Recurent : ${fmtAr(recurExp)}` },
      { x: L + (cardW + gap) * 2, title: 'SOLDE NET', main: balance,   sub1: `Taux epargne : ${savingPct} %`,    sub2: `Prevision : ${fmtAr(prevision)}` },
    ]

    cards.forEach(c => {
      // Bordure card
      doc.rect(c.x, cardY, cardW, cardH).lineWidth(0.5).strokeColor('#000').stroke()
      // Ligne supérieure épaisse
      doc.rect(c.x, cardY, cardW, 3).fill('#000')
      doc.fillColor('#000')

      // Titre card
      T(c.title, c.x + 8, cardY + 9, { bold: true, size: 8, w: cardW - 16 })

      // Montant principal
      const mainStr = fmtAr(Math.abs(c.main))
      const sign    = c.title === 'SOLDE NET' ? (c.main >= 0 ? '+' : '-') : ''
      T(`${sign}${mainStr}`, c.x + 8, cardY + 23, { bold: true, size: 13, w: cardW - 16 })

      // Ligne séparatrice
      doc.moveTo(c.x + 8, cardY + 52).lineTo(c.x + cardW - 8, cardY + 52)
         .lineWidth(0.3).strokeColor('#aaa').stroke()

      // Sous-lignes
      T(c.sub1, c.x + 8, cardY + 57, { size: 7, w: cardW - 16, color: '#444' })
      T(c.sub2, c.x + 8, cardY + 70, { size: 7, w: cardW - 16, color: '#444' })
    })

    doc.y = cardY + cardH + 20
    hLine(doc.y, 1)
    doc.y += 20

    // ════════════════════════════════════════════════════════════
    // DÉTAIL — REVENUS
    // ════════════════════════════════════════════════════════════
    const newPageIfNeeded = () => {
      if (doc.y > 750) { doc.addPage(); doc.y = 50 }
    }

    // Titre section avec total à droite
    const sectionTitle = (label, total) => {
      newPageIfNeeded()
      T(label, L, doc.y, { bold: true, size: 11, w: PW - 120 })
      T(fmtAr(total), L, doc.y, { bold: true, size: 11, w: PW, align: 'right' })
      doc.y += 14
      hLine(doc.y, 0.5)
      doc.y += 8
    }

    // Ligne item
    const itemRow = (desc, amount, sign, isRecurring) => {
      newPageIfNeeded()
      const bullet = isRecurring ? '~ ' : '* '
      T(`${bullet}${desc}`, L + 10, doc.y, { size: 9, w: PW - 120 })
      T(`${sign}${fmtAr(amount)}`, L, doc.y, { size: 9, w: PW, align: 'right' })
      doc.y += 14
    }

    // ── Revenus ───────────────────────────────────────────────────
    sectionTitle('Revenus', totalIncFull)
    if (incomes.length === 0) {
      T('Aucun revenu ce mois', L + 10, doc.y, { size: 9, color: '#888', w: PW })
      doc.y += 14
    } else {
      incomes.forEach(r => {
        const desc = [r.description, r.category?.name].filter(Boolean).join(' - ') || '-'
        itemRow(desc, r.amount, '+', r.isRecurring)
      })
    }
    doc.y += 4
    // Sous-total
    T(`Ponctuel : ${fmtAr(punctualInc)}   Recurent : ${fmtAr(recurInc)}`,
      L + 10, doc.y, { size: 8, color: '#555', w: PW })
    doc.y += 18

    hLine(doc.y, 0.3, '#999')
    doc.y += 16

    // ── Dépenses ──────────────────────────────────────────────────
    sectionTitle('Depenses', totalExpFull)
    if (expenses.length === 0) {
      T('Aucune depense ce mois', L + 10, doc.y, { size: 9, color: '#888', w: PW })
      doc.y += 14
    } else {
      expenses.forEach(r => {
        const desc = [r.description, r.category?.name].filter(Boolean).join(' - ') || '-'
        itemRow(desc, r.amount, '-', r.isRecurring)
      })
    }
    doc.y += 4
    // Sous-total
    T(`Ponctuel : ${fmtAr(punctualExp)}   Recurent : ${fmtAr(recurExp)}`,
      L + 10, doc.y, { size: 8, color: '#555', w: PW })
    doc.y += 18

    hLine(doc.y, 1)
    doc.y += 10

    // ── Solde final ───────────────────────────────────────────────
    newPageIfNeeded()
    T('SOLDE NET', L, doc.y, { bold: true, size: 11, w: PW - 120 })
    T(`${balance >= 0 ? '+' : ''}${fmtAr(balance)}`, L, doc.y,
      { bold: true, size: 11, w: PW, align: 'right' })
    doc.y += 14
    T(`Taux d'epargne : ${savingPct} %`, L + 10, doc.y, { size: 8, color: '#555', w: PW })
    doc.y += 16

    hLine(doc.y, 1)

    // ════════════════════════════════════════════════════════════
    // PIED DE PAGE
    // ════════════════════════════════════════════════════════════
    doc.flushPages()
    const pageCount = doc.bufferedPageRange().count
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i)
      hLine(822, 0.4, '#aaa')
      doc.fillColor('#888').font('Helvetica').fontSize(7)
         .text(
           `Expense Tracker  -  ${MONTHS_FR[Number(month)-1]} ${year}  -  Page ${i+1}/${pageCount}`,
           L, 830, { width: PW, align: 'center', lineBreak: false }
         )
    }

    doc.end()
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── GET /api/reports/export/excel ─────────────────────────────────
router.get('/export/excel', async (req, res) => {
  const { month, year } = req.query
  const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin',
                     'Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  try {
    const [expenses, incomes] = await Promise.all([
      prisma.expense.findMany({
        where:   { userId: req.user.id, date: dateRange(month, year) },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
      prisma.income.findMany({
        where:   { userId: req.user.id, date: dateRange(month, year) },
        include: { category: { select: { name: true } } },
        orderBy: { date: 'asc' },
      }),
    ])

    const totalExp    = expenses.reduce((s, e) => s + Number(e.amount), 0)
    const totalInc    = incomes.reduce((s, i)  => s + Number(i.amount), 0)
    const punctualExp = expenses.filter(e => !e.isRecurring).reduce((s,e) => s + Number(e.amount), 0)
    const recurExp    = expenses.filter(e =>  e.isRecurring).reduce((s,e) => s + Number(e.amount), 0)
    const punctualInc = incomes.filter(i => !i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)
    const recurInc    = incomes.filter(i =>  i.isRecurring).reduce((s,i) => s + Number(i.amount), 0)

    const wb       = new ExcelJS.Workbook()
    wb.creator     = 'Expense Tracker'
    wb.created     = new Date()

    const hFill  = hex => ({ type:'pattern', pattern:'solid', fgColor:{ argb: hex } })
    const hFont  = (hex='FFFFFF', bold=true, sz=10) => ({ bold, color:{ argb:hex }, size: sz })
    const border = { style:'thin', color:{ argb:'FFD0D0D0' } }
    const allBdr = { top:border, left:border, bottom:border, right:border }
    const rAlign = { horizontal:'right',  vertical:'middle' }
    const lAlign = { horizontal:'left',   vertical:'middle' }
    const cAlign = { horizontal:'center', vertical:'middle' }

    // ── Feuille Résumé ────────────────────────────────────────────
    const wsS = wb.addWorksheet('Résumé', { tabColor:{ argb:'FF444444' } })
    wsS.columns = [{ key:'l', width:34 }, { key:'v', width:22 }]

    // Titre
    wsS.mergeCells('A1:B1')
    const t = wsS.getCell('A1')
    t.value     = `Relevé Financier — ${MONTHS_FR[Number(month)-1]} ${year}`
    t.font      = { bold:true, size:14 }
    t.alignment = cAlign
    wsS.getRow(1).height = 28

    wsS.addRow([])

    const sRow = (label, value, bold=false, bg=null) => {
      wsS.addRow({ l: label, v: value })
      const r = wsS.lastRow
      r.height = 18
      r.getCell(1).font      = { bold, size:10 }
      r.getCell(1).alignment = lAlign
      r.getCell(1).border    = allBdr
      r.getCell(2).value     = value
      r.getCell(2).numFmt    = '#,##0 "Ar"'
      r.getCell(2).font      = { bold, size:10 }
      r.getCell(2).alignment = rAlign
      r.getCell(2).border    = allBdr
      if (bg) {
        r.getCell(1).fill = hFill(bg)
        r.getCell(2).fill = hFill(bg)
      }
    }

    wsS.addRow({ l:'REVENUS', v:'' })
    wsS.lastRow.getCell(1).font = { bold:true, size:11 }
    wsS.lastRow.height = 20

    sRow('  Ponctuels',  punctualInc)
    sRow('  Récurrents', recurInc)
    sRow('TOTAL REVENUS', totalInc, true, 'FFE8F5E9')
    wsS.addRow([])

    wsS.addRow({ l:'DÉPENSES', v:'' })
    wsS.lastRow.getCell(1).font = { bold:true, size:11 }
    wsS.lastRow.height = 20

    sRow('  Ponctuelles', punctualExp)
    sRow('  Récurrentes', recurExp)
    sRow('TOTAL DÉPENSES', totalExp, true, 'FFFCE4E4')
    wsS.addRow([])

    sRow('SOLDE NET', totalInc - totalExp, true, totalInc - totalExp >= 0 ? 'FFE8F5E9' : 'FFFCE4E4')

    // ── Helper feuille transactions ───────────────────────────────
    const addSheet = (name, tabColor, rows, totalVal) => {
      const ws = wb.addWorksheet(name, { tabColor:{ argb: tabColor } })
      ws.columns = [
        { key:'date',     width:14 },
        { key:'category', width:20 },
        { key:'desc',     width:34 },
        { key:'type',     width:14 },
        { key:'amount',   width:22 },
      ]

      // En-tête
      ws.addRow(['Date','Catégorie','Description','Type','Montant (Ar)'])
      const h = ws.lastRow
      h.height = 20
      h.eachCell(c => {
        c.fill   = hFill(tabColor)
        c.font   = hFont()
        c.border = allBdr
        c.alignment = cAlign
      })
      h.getCell(5).alignment = rAlign

      // Données
      rows.forEach((r, i) => {
        ws.addRow({
          date:     new Date(r.date).toLocaleDateString('fr-FR'),
          category: r.category?.name || '-',
          desc:     r.description    || '-',
          type:     r.isRecurring ? 'Récurrent' : 'Ponctuel',
          amount:   Number(r.amount),
        })
        const dr = ws.lastRow
        dr.height = 17
        const bg  = i % 2 === 0 ? 'FFFFFFFF' : 'FFF9F9F9'
        dr.eachCell(c => { c.fill = hFill(bg); c.font = { size:10 }; c.border = allBdr })
        dr.getCell(4).font      = { size:10, color:{ argb: r.isRecurring ? 'FF6C5CE7' : 'FF888888' } }
        dr.getCell(5).numFmt    = '#,##0 "Ar"'
        dr.getCell(5).font      = { bold:true, size:10 }
        dr.getCell(5).alignment = rAlign
      })

      // Total
      ws.addRow(['','','','TOTAL', totalVal])
      const tr = ws.lastRow
      tr.height = 20
      tr.getCell(4).font      = hFont('FF000000', true, 11)
      tr.getCell(4).fill      = hFill('FFF0F0F0')
      tr.getCell(4).border    = allBdr
      tr.getCell(4).alignment = cAlign
      tr.getCell(5).numFmt    = '#,##0 "Ar"'
      tr.getCell(5).font      = { bold:true, size:11 }
      tr.getCell(5).fill      = hFill('FFF0F0F0')
      tr.getCell(5).alignment = rAlign
      tr.getCell(5).border    = allBdr
    }

    addSheet('Revenus',  'FF2E7D32', incomes,  totalInc)
    addSheet('Dépenses', 'FFC62828', expenses, totalExp)

    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition',
      `attachment; filename=rapport-${year}-${String(month).padStart(2,'0')}.xlsx`)
    await wb.xlsx.write(res)
    res.end()
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
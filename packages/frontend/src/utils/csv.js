// Export CSV compatible Excel (FR) : séparateur « ; » + BOM UTF-8
export function downloadCSV(filename, header, rows) {
  const esc = v => {
    const s = v == null ? '' : String(v)
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const content = [header, ...rows].map(r => r.map(esc).join(';')).join('\r\n')
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Regroupe des transactions par jour (ordre décroissant)
export function groupByDay(items) {
  const groups = new Map()
  items
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .forEach(it => {
      const key = String(it.date).split('T')[0]
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(it)
    })
  return [...groups.entries()].map(([day, list]) => ({
    day, list, total: list.reduce((s, x) => s + Number(x.amount), 0),
  }))
}

// Libellé lisible d'un jour : « Aujourd'hui », « Hier », « lundi 3 mars »
export function dayLabel(isoDay) {
  const [y, m, d] = isoDay.split('-').map(Number)
  const date  = new Date(y, m - 1, d)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff  = Math.round((today - date) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Hier'
  return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

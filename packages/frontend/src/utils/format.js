export const fmt     = (n) => `${Number(n).toLocaleString('fr-MG')} Ar`
export const pct     = (a, b) => b > 0 ? Math.min(100, Math.round((a / b) * 100)) : 0
export const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' })
export const MONTHS_SM  = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']
export const MONTHS_FULL = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
export const MONTHS  = MONTHS_FULL

import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem('theme') || 'system'
  )

  // Applique la classe sur <html> à chaque changement
  useEffect(() => {
    const root = document.documentElement

    const apply = (t) => {
      root.classList.remove('light', 'dark')
      root.classList.add(t)
    }

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      apply(prefersDark ? 'dark' : 'light')

      // Écoute les changements système en temps réel
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e) => apply(e.matches ? 'dark' : 'light')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    } else {
      apply(theme)
    }
  }, [theme])

  const setTheme = (t) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans un <ThemeProvider>')
  return ctx
}
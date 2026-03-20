import * as LucideIcons from 'lucide-react'

/**
 * Retourne le composant Lucide correspondant au nom string.
 * Ex: "ShoppingCart" → <ShoppingCart />
 * Fallback : <Tag /> si le nom n'existe pas.
 */
export function getIcon(name, props = {}) {
  if (!name) {
    const Fallback = LucideIcons['Tag']
    return <Fallback {...props}/>
  }
  const Icon = LucideIcons[name]
  if (!Icon) {
    const Fallback = LucideIcons['Tag']
    return <Fallback {...props}/>
  }
  return <Icon {...props}/>
}

/**
 * Composant direct : <LucideIcon name="ShoppingCart" size={16} color="#fff" />
 */
export function LucideIcon({ name, ...props }) {
  return getIcon(name, props)
}
type TagVariant = 'default' | 'terracotta' | 'gold' | 'forest'

interface TagBadgeProps {
  label: string
  variant?: TagVariant
  className?: string
}

const variantStyles: Record<TagVariant, string> = {
  default: 'bg-brand-cream text-ui-secondary border border-ui-border',
  terracotta: 'bg-brand-terracotta/10 text-brand-terracotta border border-brand-terracotta/20',
  gold: 'bg-brand-gold/10 text-brand-gold border border-brand-gold/20',
  forest: 'bg-brand-forest/10 text-brand-forest border border-brand-forest/20',
}

export function TagBadge({ label, variant = 'default', className = '' }: TagBadgeProps) {
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${variantStyles[variant]} ${className}`}>
      {label}
    </span>
  )
}

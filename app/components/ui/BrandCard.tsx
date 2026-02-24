interface BrandCardProps {
  children: React.ReactNode
  className?: string
  texture?: boolean
}

export function BrandCard({ children, className = '', texture = false }: BrandCardProps) {
  return (
    <div className={`bg-white rounded-card shadow-card ${texture ? 'texture-overlay' : ''} ${className}`}>
      {children}
    </div>
  )
}

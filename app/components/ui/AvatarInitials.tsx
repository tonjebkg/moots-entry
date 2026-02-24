interface AvatarInitialsProps {
  name: string
  size?: number
  className?: string
}

export function AvatarInitials({ name, size = 34, className = '' }: AvatarInitialsProps) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div
      className={`shrink-0 rounded-full bg-gradient-to-br from-brand-terracotta to-brand-forest flex items-center justify-center text-white font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}

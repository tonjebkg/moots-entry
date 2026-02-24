export default function PublicRsvpLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#FAF9F7]">
      {children}
    </div>
  )
}

export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="relative">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 w-8 h-8 rounded-full border-2 border-transparent border-t-primary animate-spin" />
      </div>
    </div>
  )
}

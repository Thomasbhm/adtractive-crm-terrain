export default function Spinner({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      {message && <p className="mt-4 text-primary font-medium text-lg">{message}</p>}
    </div>
  )
}

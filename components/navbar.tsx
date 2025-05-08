import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <header className="border-b">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="font-bold text-xl">
          Fútbol Inscripción
        </Link>
        <nav className="flex gap-4">
          <Button asChild variant="ghost">
            <Link href="/">Inicio</Link>
          </Button>
          <Button asChild>
            <Link href="/create">Crear Partido</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

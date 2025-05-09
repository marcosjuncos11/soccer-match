"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SoccerBall } from "./soccer-ball"
import { usePathname } from "next/navigation"

export function Navbar() {
  const pathname = usePathname()

  // Check if we're on a match or teams page
  const isMatchPage = pathname.includes("/match/")

  // If we're on a match page, don't show the navigation links
  if (isMatchPage) {
    return (
      <header className="border-b border-green-200 bg-white shadow-sm sticky top-0 z-10">
        <div className="container flex h-16 items-center">
          <div className="font-bold text-xl text-green-800 flex items-center gap-2">
            <SoccerBall className="h-8 w-8" />
            <span>Fútbol Inscripción</span>
          </div>
        </div>
      </header>
    )
  }

  // Regular navbar for other pages
  return (
    <header className="border-b border-green-200 bg-white shadow-sm sticky top-0 z-10">
      <div className="container flex h-16 items-center justify-between">
        <Link
          href="/"
          className="font-bold text-xl text-green-800 flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <SoccerBall className="h-8 w-8" />
          <span>Fútbol Inscripción</span>
        </Link>
        <nav className="flex gap-4">
          <Button asChild variant="ghost" className="text-green-700 hover:text-green-800 hover:bg-green-50">
            <Link href="/">Inicio</Link>
          </Button>
          <Button asChild className="bg-green-600 hover:bg-green-700 transition-all duration-300">
            <Link href="/create">Crear Partido</Link>
          </Button>
        </nav>
      </div>
    </header>
  )
}

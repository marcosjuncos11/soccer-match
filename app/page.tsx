"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, Share2, Users, Utensils, Trash2 } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Match {
  id: string
  groupName: string
  dateTime: string
  locationName: string
  playerLimit: number
  signupCount: number
  mealCount: number
}

export default function Home() {
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [matchToDelete, setMatchToDelete] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchMatches = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/matches")

      if (!response.ok) {
        throw new Error("Error al cargar los partidos")
      }

      const data = await response.json()
      setMatches(data)
    } catch (error) {
      console.error("Error fetching matches:", error)
      setError("Error al cargar los partidos. Por favor, intenta de nuevo más tarde.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  const handleDeleteMatch = async () => {
    if (!matchToDelete) return

    try {
      setIsDeleting(true)
      const response = await fetch(`/api/matches/${matchToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar el partido")
      }

      // Remove the deleted match from the state
      setMatches(matches.filter((match) => match.id !== matchToDelete))
    } catch (error) {
      console.error("Error deleting match:", error)
      alert("Error al eliminar el partido. Por favor, intenta de nuevo.")
    } finally {
      setIsDeleting(false)
      setMatchToDelete(null)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center space-y-8 text-center mb-12">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-green-600 rounded-lg blur opacity-25"></div>
          <h1 className="relative text-4xl font-bold tracking-tight text-green-800 bg-white px-4 py-2 rounded-lg">
            Inscripción a Partidos de Fútbol
          </h1>
        </div>
        <p className="text-muted-foreground max-w-[600px] text-lg">
          Crea y gestiona partidos de fútbol para tu equipo o grupo. Haz un seguimiento fácil de quién juega y cuándo.
        </p>
        <div className="flex gap-4">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Link href="/create">Crear Partido</Link>
          </Button>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-green-800 mb-6">Partidos Existentes</h2>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4 border-red-200 text-red-600 hover:bg-red-50" onClick={fetchMatches}>
            Reintentar
          </Button>
        </div>
      ) : matches.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <p className="text-green-700 mb-4">No hay partidos creados todavía.</p>
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/create">Crear tu Primer Partido</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <Card
              key={match.id}
              className="border-green-200 shadow-lg hover:shadow-xl transition-shadow animate-fade-in overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-green-800">{match.groupName}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setMatchToDelete(match.id)}
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
                <CardDescription>{format(new Date(match.dateTime), "PPP 'a las' p", { locale: es })}</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-center text-muted-foreground">
                    <Users className="mr-2 h-4 w-4 text-green-600" />
                    <span>
                      {match.signupCount} / {match.playerLimit} jugadores
                    </span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Utensils className="mr-2 h-4 w-4 text-green-600" />
                    <span>{match.mealCount} para asado</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                    <span>{match.locationName}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-gradient-to-r from-green-50 to-green-100">
                <div className="w-full grid grid-cols-2 gap-2">
                  <Button asChild className="bg-green-600 hover:bg-green-700">
                    <Link href={`/match/${match.id}`}>Ver Detalles</Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => {
                      const shareableLink = `${window.location.origin}/match/${match.id}`
                      const message = `¡Se largo la lista!\n\n*${match.groupName}*\n📅 ${format(new Date(match.dateTime), "PPP 'a las' p", { locale: es })}\n📍 ${match.locationName}\n🍖 PARA EL ASADO HAY ${match.mealCount} ANOTADOS!\n\nAnotate acá: ${shareableLink}`
                      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
                    }}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Compartir
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!matchToDelete} onOpenChange={(open) => !open && setMatchToDelete(null)}>
        <AlertDialogContent className="border-red-200">
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar este partido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el partido y todas sus inscripciones. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMatch}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

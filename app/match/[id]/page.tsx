"use client"

import type React from "react"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, MapPin, Users, Utensils } from "lucide-react"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
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

interface Player {
  id: string
  playerName: string
  isWaiting: boolean
  signupTime: string
  matchId: string
  hasMeal: boolean
}

interface Match {
  id: string
  groupName: string
  dateTime: string
  locationName: string
  playerLimit: number
  createdAt: string
  updatedAt: string
  signups: Player[]
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [match, setMatch] = useState<Match | null>(null)
  const [playerName, setPlayerName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [newSignup, setNewSignup] = useState(false)

  const fetchMatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${params.id}`)

      if (!response.ok) {
        throw new Error("Error al cargar los detalles del partido")
      }

      const data = await response.json()
      setMatch(data)
    } catch (error) {
      console.error("Error fetching match:", error)
      setError("Error al cargar los detalles del partido. Es posible que el partido no exista.")
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchMatch()

    // Set up auto-refresh every 5 seconds
    const intervalId = setInterval(() => {
      fetchMatch()
    }, 5000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [fetchMatch])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setIsSigningUp(true)
    try {
      const response = await fetch(`/api/matches/${params.id}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerName: playerName.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Error al inscribirse")
      }

      await fetchMatch()
      setPlayerName("")
      setNewSignup(true)
      setShowShareDialog(true)
    } catch (error: any) {
      console.error("Error signing up:", error)
      alert(error.message || "Error al inscribirse. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleUnsign = async (playerNameToRemove: string) => {
    try {
      const response = await fetch(
        `/api/matches/${params.id}/signup?playerName=${encodeURIComponent(playerNameToRemove)}`,
        {
          method: "DELETE",
        },
      )

      if (!response.ok) {
        throw new Error("Error al eliminar al jugador")
      }

      await fetchMatch()
    } catch (error) {
      console.error("Error removing player:", error)
      alert("Error al eliminar al jugador. Por favor, inténtalo de nuevo.")
    }
  }

  const handleToggleMeal = async (playerId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/matches/${params.id}/meal`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerId, hasMeal: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar el estado de la comida")
      }

      await fetchMatch()
    } catch (error) {
      console.error("Error updating meal status:", error)
      alert("Error al actualizar el estado de la comida. Por favor, inténtalo de nuevo.")
    }
  }

  const formatPlayerList = (players: Player[]) => {
    return players.map((player) => `${player.playerName}${player.hasMeal ? " 🍖" : ""}`).join("\n")
  }

  const handleShare = () => {
    if (!match) return

    const shareableLink = window.location.href
    const mainListPlayers = match.signups.filter((player) => !player.isWaiting)
    const waitingListPlayers = match.signups.filter((player) => player.isWaiting)
    const totalMeals = match.signups.filter((player) => player.hasMeal).length

    let message = `¡Se largo la lista, para el asado [${totalMeals}]!\n\n`
    message += `*${match.groupName}*\n`
    message += `📅 ${format(new Date(match.dateTime), "PPP 'a las' p")}\n`
    message += `📍 ${match.locationName}\n\n`

    message += `*Jugadores (${mainListPlayers.length}/${match.playerLimit}):*\n`
    message += formatPlayerList(mainListPlayers)

    if (waitingListPlayers.length > 0) {
      message += `\n\n*Lista de espera (${waitingListPlayers.length}):*\n`
      message += formatPlayerList(waitingListPlayers)
    }

    message += `\n\nAnotate acá: ${shareableLink}`

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  if (isLoading) {
    return (
      <div className="container py-10 text-center">
        <p>Cargando detalles del partido...</p>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="container py-10 text-center">
        <p className="text-red-500">{error || "Partido no encontrado"}</p>
      </div>
    )
  }

  const mainListPlayers = match.signups.filter((player) => !player.isWaiting)
  const waitingListPlayers = match.signups.filter((player) => player.isWaiting)
  const totalMeals = match.signups.filter((player) => player.hasMeal).length

  return (
    <div className="container py-10 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{match.groupName}</CardTitle>
              <CardDescription>Detalles del Partido</CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="flex items-center gap-1 px-3 py-1">
                      <Utensils className="h-4 w-4" />
                      <span>{totalMeals}</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total de comidas solicitadas</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button onClick={() => setShowShareDialog(true)} className="bg-green-500 hover:bg-green-600">
                Compartir por WhatsApp
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-green-600" />
              <span>{format(new Date(match.dateTime), "PPP 'a las' p")}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-green-600" />
              <span>{match.locationName}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              <span>
                {mainListPlayers.length} / {match.playerLimit} jugadores
              </span>
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4">
                Jugadores ({mainListPlayers.length}/{match.playerLimit})
              </h3>
              {mainListPlayers.length === 0 ? (
                <p className="text-muted-foreground">Aún no hay jugadores inscritos. ¡Sé el primero!</p>
              ) : (
                <ul className="space-y-2">
                  {mainListPlayers.map((player) => (
                    <li key={player.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <span>{player.playerName}</span>
                        <button
                          onClick={() => handleToggleMeal(player.id, player.hasMeal)}
                          className={`p-1 rounded-full ${
                            player.hasMeal ? "text-green-600 bg-green-100" : "text-gray-400 hover:text-gray-600"
                          }`}
                          aria-label={player.hasMeal ? "Quitar comida" : "Agregar comida"}
                        >
                          <Utensils className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUnsign(player.playerName)}
                      >
                        Eliminar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Lista de Espera ({waitingListPlayers.length})</h3>
              {waitingListPlayers.length === 0 ? (
                <p className="text-muted-foreground">No hay jugadores en lista de espera.</p>
              ) : (
                <ul className="space-y-2">
                  {waitingListPlayers.map((player, index) => (
                    <li key={player.id} className="flex justify-between items-center p-2 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <span>
                          <span className="inline-block w-6 text-muted-foreground">{index + 1}.</span>
                          {player.playerName}
                        </span>
                        <button
                          onClick={() => handleToggleMeal(player.id, player.hasMeal)}
                          className={`p-1 rounded-full ${
                            player.hasMeal ? "text-green-600 bg-green-100" : "text-gray-400 hover:text-gray-600"
                          }`}
                          aria-label={player.hasMeal ? "Quitar comida" : "Agregar comida"}
                        >
                          <Utensils className="h-4 w-4" />
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUnsign(player.playerName)}
                      >
                        Eliminar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <Separator />

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="playerName">Tu Nombre</Label>
              <div className="flex gap-2">
                <Input
                  id="playerName"
                  placeholder="Ingresa tu nombre para anotarte"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
                <Button type="submit" disabled={isSigningUp || !playerName.trim()}>
                  {isSigningUp ? "Anotando..." : "Anotarme"}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{newSignup ? "¡Te has anotado con éxito!" : "Compartir por WhatsApp"}</AlertDialogTitle>
            <AlertDialogDescription>
              {newSignup
                ? "¿Quieres compartir este partido con tus amigos por WhatsApp?"
                : "¿Quieres compartir los detalles del partido y la lista de jugadores por WhatsApp?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowShareDialog(false)
                setNewSignup(false)
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleShare()
                setShowShareDialog(false)
                setNewSignup(false)
              }}
            >
              Compartir por WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

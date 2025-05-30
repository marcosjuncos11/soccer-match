"use client"

import type React from "react"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, MapPin, Users, Utensils, Share2, UsersRound, UserPlus, ChevronUp } from "lucide-react"
import { format } from "date-fns"
import { Separator } from "@/components/ui/separator"
import { PlayerSelector } from "@/components/player-selector"
import { useRouter } from "next/navigation"
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Player {
  id: string
  playerName: string
  player_id?: string
  is_guest: boolean
  isWaiting: boolean
  signupTime: string
  matchId: string
  hasMeal: boolean
  mealOnly: boolean
  positions: string[]
  order?: number
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
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedPlayerName, setSelectedPlayerName] = useState("")
  const [isSelectedPlayerGuest, setIsSelectedPlayerGuest] = useState(false)
  const [selectedMealPlayerName, setSelectedMealPlayerName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSigningUp, setIsSigningUp] = useState(false)
  const [isSigningUpMealOnly, setIsSigningUpMealOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [newSignup, setNewSignup] = useState(false)
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [isMovingPlayer, setIsMovingPlayer] = useState<string | null>(null)

  // Ref for the signup section
  const signupSectionRef = useRef<HTMLDivElement>(null)

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
      // Only refresh if not editing positions or moving players
      if (!editingPlayerId && !isMovingPlayer) {
        fetchMatch()
      }
    }, 5000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [fetchMatch, editingPlayerId, isMovingPlayer])

  const scrollToSignup = () => {
    signupSectionRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handlePlayerSelect = (playerId: string | null, playerName: string, isGuest: boolean) => {
    setSelectedPlayerId(playerId)
    setSelectedPlayerName(playerName)
    setIsSelectedPlayerGuest(isGuest)
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayerName.trim()) return

    setIsSigningUp(true)
    try {
      const response = await fetch(`/api/matches/${params.id}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: selectedPlayerId,
          playerName: selectedPlayerName,
          mealOnly: false,
          isGuest: isSelectedPlayerGuest,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al inscribirse")
      }

      await fetchMatch()
      setSelectedPlayerId(null)
      setSelectedPlayerName("")
      setIsSelectedPlayerGuest(false)
      setNewSignup(true)
      setShowShareDialog(true)
    } catch (error: any) {
      console.error("Error signing up:", error)
      alert(error.message || "Error al inscribirse. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSigningUp(false)
    }
  }

  const handleMealOnlySignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMealPlayerName.trim()) return

    setIsSigningUpMealOnly(true)
    try {
      const response = await fetch(`/api/matches/${params.id}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName: selectedMealPlayerName,
          mealOnly: true,
          isGuest: true, // All meal-only signups are treated as guests
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al inscribirse")
      }

      await fetchMatch()
      setSelectedMealPlayerName("")
      setNewSignup(true)
      setShowShareDialog(true)
    } catch (error: any) {
      console.error("Error signing up for meal only:", error)
      alert(error.message || "Error al inscribirse. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSigningUpMealOnly(false)
    }
  }

  const handleUnsign = async (signupId: string) => {
    try {
      const response = await fetch(`/api/matches/${params.id}/signup?signupId=${encodeURIComponent(signupId)}`, {
        method: "DELETE",
      })

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

  const handleMovePlayerUp = async (playerId: string) => {
    setIsMovingPlayer(playerId)
    try {
      const response = await fetch(`/api/matches/${params.id}/player/order`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerId }),
      })

      if (!response.ok) {
        throw new Error("Error al mover al jugador")
      }

      await fetchMatch()
    } catch (error) {
      console.error("Error moving player:", error)
      alert("Error al mover al jugador. Por favor, inténtalo de nuevo.")
    } finally {
      setIsMovingPlayer(null)
    }
  }

  const formatPlayerList = (players: Player[]) => {
    return players.map((player, index) => `${index + 1}. ${player.playerName}${player.hasMeal ? " 🍖" : ""}`).join("\n")
  }

  const handleShare = () => {
    if (!match) return

    const shareableLink = window.location.href
    const mainListPlayers = match.signups.filter((player) => !player.isWaiting && !player.mealOnly)
    const waitingListPlayers = match.signups.filter((player) => player.isWaiting && !player.mealOnly)
    const mealOnlyPlayers = match.signups.filter((player) => player.mealOnly)
    const totalMeals = match.signups.filter((player) => player.hasMeal || player.mealOnly).length

    let message = `¡Se largo la lista!\n\n`
    message += `*${match.groupName}*\n`
    message += `📅 ${format(new Date(match.dateTime), "PPP 'a las' p")}\n`
    message += `📍 ${match.locationName}\n`
    message += `🍖 PARA EL ASADO HAY ${totalMeals} ANOTADOS!\n\n`

    // Add the signup link before the player list
    message += `Anotate acá: ${shareableLink}\n\n`

    message += `*Jugadores (${mainListPlayers.length}/${match.playerLimit}):*\n`
    message += formatPlayerList(mainListPlayers)

    if (waitingListPlayers.length > 0) {
      message += `\n\n*Lista de espera (${waitingListPlayers.length}):*\n`
      message += formatPlayerList(waitingListPlayers)
    }

    if (mealOnlyPlayers.length > 0) {
      message += `\n\n*Solo para comer (${mealOnlyPlayers.length}):*\n`
      message += formatPlayerList(mealOnlyPlayers)
    }

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  // Render meal icon with enhanced visibility
  const renderMealIcon = (playerId: string, hasMeal: boolean) => {
    return (
      <button
        onClick={() => handleToggleMeal(playerId, hasMeal)}
        className={`rounded-full transition-all ${
          hasMeal
            ? "bg-green-500 text-white p-2 shadow-md hover:bg-green-600"
            : "text-gray-400 p-1.5 hover:text-gray-600 hover:bg-gray-100"
        }`}
        aria-label={hasMeal ? "Quitar comida" : "Agregar comida"}
        title={hasMeal ? "Anotado para comer" : "Anotar para comer"}
      >
        <Utensils className={`${hasMeal ? "h-5 w-5" : "h-4 w-4"}`} />
      </button>
    )
  }

  // Sort players by order
  const sortPlayersByOrder = (players: Player[]) => {
    return [...players].sort((a, b) => {
      // If order is not defined, use signup time
      const orderA = a.order !== undefined ? a.order : 999999
      const orderB = b.order !== undefined ? b.order : 999999
      return orderA - orderB
    })
  }

  if (isLoading) {
    return (
      <div className="container py-10 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-700">Cargando detalles del partido...</p>
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="container py-10 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 inline-block">
          <p className="text-red-500 font-medium">{error || "Partido no encontrado"}</p>
          <Button
            variant="outline"
            className="mt-4 border-red-200 text-red-600 hover:bg-red-50"
            onClick={() => window.history.back()}
          >
            Volver
          </Button>
        </div>
      </div>
    )
  }

  // Get players and sort them by order
  let mainListPlayers = match.signups.filter((player) => !player.isWaiting && !player.mealOnly)
  let waitingListPlayers = match.signups.filter((player) => player.isWaiting && !player.mealOnly)
  let mealOnlyPlayers = match.signups.filter((player) => player.mealOnly)

  // Sort players by order
  mainListPlayers = sortPlayersByOrder(mainListPlayers)
  waitingListPlayers = sortPlayersByOrder(waitingListPlayers)
  mealOnlyPlayers = sortPlayersByOrder(mealOnlyPlayers)

  const totalMeals = match.signups.filter((player) => player.hasMeal || player.mealOnly).length

  return (
    <div className="container py-10 max-w-4xl">
      <Card className="border-green-200 shadow-lg animate-fade-in overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <CardTitle className="text-2xl text-green-800">{match.groupName}</CardTitle>
              <CardDescription>Detalles del Partido</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={scrollToSignup}
                className="bg-green-600 hover:bg-green-700 transition-all duration-300 flex-grow md:flex-grow-0"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Anotarme
              </Button>
              <Button
                onClick={() => router.push(`/match/${params.id}/teams`)}
                className="bg-green-600 hover:bg-green-700 transition-all duration-300 flex-grow md:flex-grow-0"
              >
                <UsersRound className="mr-2 h-4 w-4" />
                Armar Equipos
              </Button>
              <Button
                onClick={() => setShowShareDialog(true)}
                className="bg-green-600 hover:bg-green-700 transition-all duration-300 flex-grow md:flex-grow-0"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <CalendarIcon className="mr-2 h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 text-sm md:text-base">
                {format(new Date(match.dateTime), "PPP 'a las' p")}
              </span>
            </div>
            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <MapPin className="mr-2 h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 text-sm md:text-base">{match.locationName}</span>
            </div>
            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <Users className="mr-2 h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 text-sm md:text-base">
                {mainListPlayers.length} / {match.playerLimit} jugadores
              </span>
            </div>
            <div className="flex items-center p-3 bg-green-50 rounded-lg border border-green-100">
              <Utensils className="mr-2 h-5 w-5 text-green-600 flex-shrink-0" />
              <span className="text-green-800 text-sm md:text-base">{totalMeals} para asado</span>
            </div>
          </div>

          <Separator className="bg-green-100" />

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-800 flex items-center">
                <Users className="mr-2 h-5 w-5 text-green-600" />
                Jugadores ({mainListPlayers.length}/{match.playerLimit})
              </h3>
              {mainListPlayers.length === 0 ? (
                <p className="text-muted-foreground bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                  Aún no hay jugadores inscritos. ¡Sé el primero!
                </p>
              ) : (
                <ul className="space-y-2">
                  {mainListPlayers.map((player, index) => (
                    <li
                      key={player.id}
                      className="flex justify-between items-start p-3 bg-white rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-6 text-green-600 font-bold">{index + 1}.</span>
                          <span className="font-medium">
                            {player.playerName}
                            {player.is_guest && <span className="text-xs text-gray-500 ml-1">(Invitado)</span>}
                          </span>
                          {renderMealIcon(player.id, player.hasMeal)}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleMovePlayerUp(player.id)}
                                  disabled={isMovingPlayer === player.id || index === 0}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    index === 0
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-green-500 hover:text-green-700 hover:bg-green-50"
                                  }`}
                                  aria-label="Mover arriba"
                                >
                                  {isMovingPlayer === player.id ? (
                                    <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mover arriba</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUnsign(player.id)}
                      >
                        Eliminar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-green-800 flex items-center">
                <Users className="mr-2 h-5 w-5 text-green-600" />
                Lista de Espera ({waitingListPlayers.length})
              </h3>
              {waitingListPlayers.length === 0 ? (
                <p className="text-muted-foreground bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                  No hay jugadores en lista de espera.
                </p>
              ) : (
                <ul className="space-y-2">
                  {waitingListPlayers.map((player, index) => (
                    <li
                      key={player.id}
                      className="flex justify-between items-start p-3 bg-white rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-6 text-green-600 font-bold">{index + 1}.</span>
                          <span className="font-medium">
                            {player.playerName}
                            {player.is_guest && <span className="text-xs text-gray-500 ml-1">(Invitado)</span>}
                          </span>
                          {renderMealIcon(player.id, player.hasMeal)}
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => handleMovePlayerUp(player.id)}
                                  disabled={isMovingPlayer === player.id || index === 0}
                                  className={`p-1.5 rounded-full transition-colors ${
                                    index === 0
                                      ? "text-gray-300 cursor-not-allowed"
                                      : "text-green-500 hover:text-green-700 hover:bg-green-50"
                                  }`}
                                  aria-label="Mover arriba"
                                >
                                  {isMovingPlayer === player.id ? (
                                    <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                  ) : (
                                    <ChevronUp className="h-4 w-4" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Mover arriba</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleUnsign(player.id)}
                      >
                        Eliminar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-green-800 flex items-center">
              <Utensils className="mr-2 h-5 w-5 text-green-600" />
              Solo para Comer ({mealOnlyPlayers.length})
            </h3>
            {mealOnlyPlayers.length === 0 ? (
              <p className="text-muted-foreground bg-green-50 p-4 rounded-lg border border-green-100 text-center">
                No hay personas anotadas solo para comer.
              </p>
            ) : (
              <ul className="space-y-2">
                {mealOnlyPlayers.map((player, index) => (
                  <li
                    key={player.id}
                    className="flex justify-between items-center p-3 bg-white rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow animate-fade-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-6 text-green-600 font-bold">{index + 1}.</span>
                      <span className="font-medium">
                        {player.playerName}
                        {player.is_guest && <span className="text-xs text-gray-500 ml-1">(Invitado)</span>}
                      </span>
                      <span className="bg-green-500 text-white p-2 rounded-full shadow-md">
                        <Utensils className="h-5 w-5" />
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleMovePlayerUp(player.id)}
                              disabled={isMovingPlayer === player.id || index === 0}
                              className={`p-1.5 rounded-full transition-colors ${
                                index === 0
                                  ? "text-gray-300 cursor-not-allowed"
                                  : "text-green-500 hover:text-green-700 hover:bg-green-50"
                              }`}
                              aria-label="Mover arriba"
                            >
                              {isMovingPlayer === player.id ? (
                                <div className="h-4 w-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                <ChevronUp className="h-4 w-4" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Mover arriba</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleUnsign(player.id)}
                    >
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator className="bg-green-100" />

          {/* Two separate signup sections */}
          <div ref={signupSectionRef} className="grid gap-6 md:grid-cols-2">
            {/* Player signup section */}
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">
                  <Users className="mr-2 h-5 w-5 text-green-600" />
                  Anotarme para Jugar
                </h3>
                <form onSubmit={handleSignup} className="space-y-4">
                  <PlayerSelector
                    onPlayerSelect={handlePlayerSelect}
                    disabled={isSigningUp}
                    label="Seleccionar Jugador"
                    placeholder="Selecciona un jugador o agrega un invitado"
                  />

                  <Button
                    type="submit"
                    disabled={isSigningUp || !selectedPlayerName.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 transition-all duration-300"
                  >
                    {isSigningUp ? "Anotando..." : "Anotarme"}
                  </Button>
                </form>
              </div>
            </div>

            {/* Meal-only signup section */}
            <div className="space-y-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="text-lg font-medium text-green-800 mb-4 flex items-center">
                  <Utensils className="mr-2 h-5 w-5 text-green-600" />
                  Anotarme Solo para Comer
                </h3>

                <p className="text-sm text-muted-foreground mt-2">
                  Ingresa tu nombre para anotarte solo para el asado, sin jugar el partido.
                </p>

                <form onSubmit={handleMealOnlySignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mealOnlyName" className="text-green-700">
                      Nombre
                    </Label>
                    <Input
                      id="mealOnlyName"
                      placeholder="Ingresa tu nombre"
                      value={selectedMealPlayerName}
                      onChange={(e) => setSelectedMealPlayerName(e.target.value)}
                      disabled={isSigningUpMealOnly}
                      className="border-green-200 focus-visible:ring-green-500"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSigningUpMealOnly || !selectedMealPlayerName.trim()}
                    className="w-full bg-green-600 hover:bg-green-700 transition-all duration-300"
                  >
                    {isSigningUpMealOnly ? "Anotando..." : "Anotarme"}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    Al anotarte solo para comer, no ocuparás un lugar en la lista de jugadores.
                  </p>
                </form>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent className="animate-bounce-in border-green-200">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Share2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">
              {newSignup ? "¡Te has anotado con éxito!" : "Compartir por WhatsApp"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
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
              className="bg-green-600 hover:bg-green-700"
            >
              Compartir por WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, RefreshCw, ArrowLeft, Share2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"

interface Player {
  id: string
  playerName: string
  isWaiting: boolean
  signupTime: string
  matchId: string
  hasMeal: boolean
  mealOnly: boolean
  positions: string[]
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

interface TeamPlayer extends Player {
  team: number
}

export default function TeamsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const fetchMatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${params.id}`)

      if (!response.ok) {
        throw new Error("Error al cargar los detalles del partido")
      }

      const data = await response.json()
      setMatch(data)

      // Only get active players (not waiting, not meal-only)
      const activePlayers = data.signups.filter((player: Player) => !player.isWaiting && !player.mealOnly)

      // Generate teams on initial load
      generateTeams(activePlayers)
    } catch (error) {
      console.error("Error fetching match:", error)
      setError("Error al cargar los detalles del partido. Es posible que el partido no exista.")
    } finally {
      setIsLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchMatch()
  }, [fetchMatch])

  const generateTeams = (players: Player[]) => {
    setIsGenerating(true)

    try {
      // Create a copy of players to work with
      const playersCopy = [...players]

      // Shuffle the players array
      for (let i = playersCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[playersCopy[i], playersCopy[j]] = [playersCopy[j], playersCopy[i]]
      }

      // Count positions for balancing
      const positionCounts = {
        team1: { arco: 0, defensa: 0, medio: 0, delantero: 0 },
        team2: { arco: 0, defensa: 0, medio: 0, delantero: 0 },
      }

      // Sort players by position priority (arco first, then defensa, etc.)
      const sortedPlayers = [...playersCopy].sort((a, b) => {
        const getPositionPriority = (player: Player) => {
          if (!player.positions || player.positions.length === 0) return 4
          if (player.positions.includes("arco")) return 0
          if (player.positions.includes("defensa")) return 1
          if (player.positions.includes("medio")) return 2
          if (player.positions.includes("delantero")) return 3
          return 4
        }

        return getPositionPriority(a) - getPositionPriority(b)
      })

      // Assign teams, trying to balance positions
      const teamAssignments: TeamPlayer[] = []

      // First, assign goalkeepers to different teams if possible
      const goalkeepers = sortedPlayers.filter((p) => p.positions && p.positions.includes("arco"))
      if (goalkeepers.length >= 2) {
        teamAssignments.push({ ...goalkeepers[0], team: 1 })
        teamAssignments.push({ ...goalkeepers[1], team: 2 })
        positionCounts.team1.arco++
        positionCounts.team2.arco++

        // Remove assigned players
        sortedPlayers.splice(sortedPlayers.indexOf(goalkeepers[0]), 1)
        sortedPlayers.splice(sortedPlayers.indexOf(goalkeepers[1]), 1)
      } else if (goalkeepers.length === 1) {
        teamAssignments.push({ ...goalkeepers[0], team: 1 })
        positionCounts.team1.arco++

        // Remove assigned player
        sortedPlayers.splice(sortedPlayers.indexOf(goalkeepers[0]), 1)
      }

      // Assign remaining players, balancing positions
      for (const player of sortedPlayers) {
        // Calculate which team has fewer players of this position
        let team = 1
        if (player.positions && player.positions.length > 0) {
          const primaryPosition = player.positions[0]
          if (
            positionCounts.team1[primaryPosition as keyof typeof positionCounts.team1] >
            positionCounts.team2[primaryPosition as keyof typeof positionCounts.team2]
          ) {
            team = 2
          }
        } else {
          // If no positions, just balance team sizes
          const team1Count = teamAssignments.filter((p) => p.team === 1).length
          const team2Count = teamAssignments.filter((p) => p.team === 2).length
          team = team1Count <= team2Count ? 1 : 2
        }

        // Assign to team
        teamAssignments.push({ ...player, team })

        // Update position counts
        if (player.positions) {
          for (const pos of player.positions) {
            if (pos in positionCounts[`team${team}`]) {
              positionCounts[`team${team}`][pos as keyof typeof positionCounts.team1]++
            }
          }
        }
      }

      setTeamPlayers(teamAssignments)
    } catch (error) {
      console.error("Error generating teams:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRegenerateTeams = () => {
    if (!match) return

    const activePlayers = match.signups.filter((player) => !player.isWaiting && !player.mealOnly)
    generateTeams(activePlayers)
  }

  const movePlayerToOtherTeam = (playerId: string) => {
    setTeamPlayers((prev) =>
      prev.map((player) => (player.id === playerId ? { ...player, team: player.team === 1 ? 2 : 1 } : player)),
    )
  }

  const handleShareTeams = () => {
    if (!match) return

    const team1Players = teamPlayers.filter((player) => player.team === 1)
    const team2Players = teamPlayers.filter((player) => player.team === 2)

    const positionLabels: Record<string, string> = {
      arco: "Arco",
      defensa: "Defensa",
      medio: "Medio",
      delantero: "Delantero",
    }

    // Format the message
    let message = `*EQUIPOS PARA EL PARTIDO*\n\n`

    // Add match details
    message += `*${match.groupName}*\n`
    message += `📅 ${format(new Date(match.dateTime), "PPP 'a las' p", { locale: es })}\n`
    message += `📍 ${match.locationName}\n\n`

    // Team 1
    message += `*EQUIPO 1 (${team1Players.length} jugadores)*\n`
    team1Players.forEach((player, index) => {
      let playerInfo = `${index + 1}. ${player.playerName}`

      // Add positions if available
      if (player.positions && player.positions.length > 0) {
        const positionText = player.positions.map((pos) => positionLabels[pos] || pos).join(", ")
        playerInfo += ` (${positionText})`
      }

      message += `${playerInfo}\n`
    })

    // Team 2
    message += `\n*EQUIPO 2 (${team2Players.length} jugadores)*\n`
    team2Players.forEach((player, index) => {
      let playerInfo = `${index + 1}. ${player.playerName}`

      // Add positions if available
      if (player.positions && player.positions.length > 0) {
        const positionText = player.positions.map((pos) => positionLabels[pos] || pos).join(", ")
        playerInfo += ` (${positionText})`
      }

      message += `${playerInfo}\n`
    })

    // Open WhatsApp with the message
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  // Helper function to display positions
  const getPositionBadges = (positions: string[]) => {
    if (!positions || positions.length === 0) return null

    const positionLabels: Record<string, string> = {
      arco: "Arco",
      defensa: "Defensa",
      medio: "Medio",
      delantero: "Delantero",
    }

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {positions.map((pos) => (
          <Badge key={pos} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
            {positionLabels[pos] || pos}
          </Badge>
        ))}
      </div>
    )
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
            onClick={() => router.back()}
          >
            Volver
          </Button>
        </div>
      </div>
    )
  }

  const team1Players = teamPlayers.filter((player) => player.team === 1)
  const team2Players = teamPlayers.filter((player) => player.team === 2)

  // Count positions per team
  const team1Positions = {
    arco: team1Players.filter((p) => p.positions && p.positions.includes("arco")).length,
    defensa: team1Players.filter((p) => p.positions && p.positions.includes("defensa")).length,
    medio: team1Players.filter((p) => p.positions && p.positions.includes("medio")).length,
    delantero: team1Players.filter((p) => p.positions && p.positions.includes("delantero")).length,
  }

  const team2Positions = {
    arco: team2Players.filter((p) => p.positions && p.positions.includes("arco")).length,
    defensa: team2Players.filter((p) => p.positions && p.positions.includes("defensa")).length,
    medio: team2Players.filter((p) => p.positions && p.positions.includes("medio")).length,
    delantero: team2Players.filter((p) => p.positions && p.positions.includes("delantero")).length,
  }

  return (
    <div className="container py-6 px-2 sm:py-10 sm:px-4 max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowLeft className="h-4 w-4" />
          Volver al Partido
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleShareTeams} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-auto">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir Equipos
          </Button>
          <Button
            onClick={handleRegenerateTeams}
            disabled={isGenerating}
            className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-auto"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isGenerating ? "Generando..." : "Armar de Nuevo"}
          </Button>
        </div>
      </div>

      {/* Teams side by side with flex layout that works on all screen sizes */}
      <div className="flex flex-row space-x-2 w-full">
        {/* Team 1 */}
        <Card className="border-green-200 shadow-lg animate-fade-in overflow-hidden w-1/2">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-2 sm:p-4">
            <CardTitle className="text-base sm:text-xl text-green-800">Equipo 1</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{team1Players.length} jugadores</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="flex flex-wrap gap-1 mb-2 sm:mb-4">
              {team1Positions.arco > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Arco: {team1Positions.arco}
                </Badge>
              )}
              {team1Positions.defensa > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Defensa: {team1Positions.defensa}
                </Badge>
              )}
              {team1Positions.medio > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Medio: {team1Positions.medio}
                </Badge>
              )}
              {team1Positions.delantero > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Delantero: {team1Positions.delantero}
                </Badge>
              )}
            </div>

            <ul className="space-y-1 sm:space-y-2">
              {team1Players.map((player, index) => (
                <li
                  key={player.id}
                  className="flex justify-between items-start p-1 sm:p-2 bg-white rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col max-w-[75%]">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-4 text-green-600 font-bold text-xs sm:text-sm">{index + 1}.</span>
                      <span className="font-medium text-xs sm:text-sm truncate">{player.playerName}</span>
                    </div>
                    <div className="hidden sm:block">{getPositionBadges(player.positions)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0 sm:p-1"
                    onClick={() => movePlayerToOtherTeam(player.id)}
                  >
                    <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Team 2 */}
        <Card className="border-green-200 shadow-lg animate-fade-in overflow-hidden w-1/2">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-2 sm:p-4">
            <CardTitle className="text-base sm:text-xl text-green-800">Equipo 2</CardTitle>
            <CardDescription className="text-xs sm:text-sm">{team2Players.length} jugadores</CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-4">
            <div className="flex flex-wrap gap-1 mb-2 sm:mb-4">
              {team2Positions.arco > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Arco: {team2Positions.arco}
                </Badge>
              )}
              {team2Positions.defensa > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Defensa: {team2Positions.defensa}
                </Badge>
              )}
              {team2Positions.medio > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Medio: {team2Positions.medio}
                </Badge>
              )}
              {team2Positions.delantero > 0 && (
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Delantero: {team2Positions.delantero}
                </Badge>
              )}
            </div>

            <ul className="space-y-1 sm:space-y-2">
              {team2Players.map((player, index) => (
                <li
                  key={player.id}
                  className="flex justify-between items-start p-1 sm:p-2 bg-white rounded-lg border border-green-100 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col max-w-[75%]">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-4 text-green-600 font-bold text-xs sm:text-sm">{index + 1}.</span>
                      <span className="font-medium text-xs sm:text-sm truncate">{player.playerName}</span>
                    </div>
                    <div className="hidden sm:block">{getPositionBadges(player.positions)}</div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0 sm:p-1"
                    onClick={() => movePlayerToOtherTeam(player.id)}
                  >
                    <ArrowLeftRight className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

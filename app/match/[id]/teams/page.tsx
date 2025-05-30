"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeftRight, RefreshCw, ArrowLeft, Share2, GripVertical, Sparkles, Brain } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DragDropContext, Droppable, Draggable, type DropResult } from "react-beautiful-dnd"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Player {
  id: string
  playerName: string
  isWaiting: boolean
  signupTime: string
  matchId: string
  hasMeal: boolean
  mealOnly: boolean
  positions: string[]
  is_guest?: boolean
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
  assignedPosition?: string
  reasoning?: string
}

interface AITeamData {
  players: Array<{
    playerId: string
    playerName: string
    assignedPosition: string
    reasoning: string
  }>
  formation: string
  strengths: string[]
  weaknesses: string[]
}

interface AIGeneratedTeams {
  team1: AITeamData
  team2: AITeamData
  balanceAnalysis: {
    overallBalance: number
    explanation: string
    recommendations: string[]
  }
  teamBuildingStrategy: {
    approach: string
    keyDecisions: string[]
    balancingFactors: string[]
    expectedOutcome: string
    coachingTips: string[]
  }
}

export default function TeamsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiTeamData, setAiTeamData] = useState<AIGeneratedTeams | null>(null)
  const [activeTab, setActiveTab] = useState("manual")

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

  const generateAITeams = async () => {
    if (!match) return

    setIsGeneratingAI(true)
    try {
      const response = await fetch(`/api/matches/${params.id}/generate-teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error generating AI teams")
      }

      const data = await response.json()
      setAiTeamData(data.teams)

      // Convert AI teams to our format
      const aiTeamPlayers: TeamPlayer[] = []

      // Add team 1 players
      data.teams.team1.players.forEach((player: any) => {
        const originalPlayer = match.signups.find((s) => s.id === player.playerId)
        if (originalPlayer) {
          aiTeamPlayers.push({
            ...originalPlayer,
            team: 1,
            assignedPosition: player.assignedPosition,
            reasoning: player.reasoning,
          })
        }
      })

      // Add team 2 players
      data.teams.team2.players.forEach((player: any) => {
        const originalPlayer = match.signups.find((s) => s.id === player.playerId)
        if (originalPlayer) {
          aiTeamPlayers.push({
            ...originalPlayer,
            team: 2,
            assignedPosition: player.assignedPosition,
            reasoning: player.reasoning,
          })
        }
      })

      setTeamPlayers(aiTeamPlayers)
      setActiveTab("ai")
    } catch (error) {
      console.error("Error generating AI teams:", error)
      alert("Error al generar equipos con IA. Por favor, inténtalo de nuevo.")
    } finally {
      setIsGeneratingAI(false)
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
      arquero: "Arco",
      defensa: "Defensa",
      defensor: "Defensa",
      medio: "Medio",
      mediocampo: "Medio",
      delantero: "Delantero",
    }

    // Format the message
    let message = `*EQUIPOS PARA EL PARTIDO*\n\n`

    // Add match details
    message += `*${match.groupName}*\n`
    message += `📅 ${format(new Date(match.dateTime), "PPP 'a las' p", { locale: es })}\n`
    message += `📍 ${match.locationName}\n\n`

    // Add AI analysis if available
    if (activeTab === "ai" && aiTeamData) {
      message += `🤖 *EQUIPOS GENERADOS CON GROQ IA*\n`
      message += `Balance General: ${aiTeamData.balanceAnalysis.overallBalance}/10\n\n`
    }

    // Team 1
    message += `*EQUIPO 1 (${team1Players.length} jugadores)*\n`
    if (activeTab === "ai" && aiTeamData) {
      message += `Formación: ${aiTeamData.team1.formation}\n`
    }
    team1Players.forEach((player, index) => {
      let playerInfo = `${index + 1}. ${player.playerName}`

      // Add meal indicator
      if (player.hasMeal) {
        playerInfo += ` 🍖`
      }

      // Add assigned position if available (AI mode)
      if (player.assignedPosition) {
        playerInfo += ` (${positionLabels[player.assignedPosition] || player.assignedPosition})`
      } else if (player.positions && player.positions.length > 0) {
        const positionText = player.positions.map((pos) => positionLabels[pos] || pos).join(", ")
        playerInfo += ` (${positionText})`
      }

      message += `${playerInfo}\n`
    })

    // Team 2
    message += `\n*EQUIPO 2 (${team2Players.length} jugadores)*\n`
    if (activeTab === "ai" && aiTeamData) {
      message += `Formación: ${aiTeamData.team2.formation}\n`
    }
    team2Players.forEach((player, index) => {
      let playerInfo = `${index + 1}. ${player.playerName}`

      // Add meal indicator
      if (player.hasMeal) {
        playerInfo += ` 🍖`
      }

      // Add assigned position if available (AI mode)
      if (player.assignedPosition) {
        playerInfo += ` (${positionLabels[player.assignedPosition] || player.assignedPosition})`
      } else if (player.positions && player.positions.length > 0) {
        const positionText = player.positions.map((pos) => positionLabels[pos] || pos).join(", ")
        playerInfo += ` (${positionText})`
      }

      message += `${playerInfo}\n`
    })

    // Add AI analysis if available
    if (activeTab === "ai" && aiTeamData) {
      message += `\n*ANÁLISIS IA:*\n${aiTeamData.balanceAnalysis.explanation}\n`

      if (aiTeamData.teamBuildingStrategy) {
        message += `\n*ESTRATEGIA:*\n${aiTeamData.teamBuildingStrategy.approach}\n`
        message += `\n*RESULTADO ESPERADO:*\n${aiTeamData.teamBuildingStrategy.expectedOutcome}\n`
      }
    }

    // Open WhatsApp with the message
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank")
  }

  // Handle drag and drop
  const handleDragEnd = (result: DropResult) => {
    const { destination, source } = result

    // If dropped outside a droppable area
    if (!destination) return

    // If dropped in the same position
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Get the team number from the droppable ID
    const sourceTeam = Number.parseInt(source.droppableId.replace("team-", ""))
    const destTeam = Number.parseInt(destination.droppableId.replace("team-", ""))

    // Create a copy of the team players
    const newTeamPlayers = [...teamPlayers]

    // Get the player that was dragged
    const team1Players = newTeamPlayers.filter((p) => p.team === 1)
    const team2Players = newTeamPlayers.filter((p) => p.team === 2)

    let movedPlayer: TeamPlayer | undefined

    // If moving between teams
    if (sourceTeam !== destTeam) {
      if (sourceTeam === 1) {
        movedPlayer = team1Players[source.index]
      } else {
        movedPlayer = team2Players[source.index]
      }

      if (movedPlayer) {
        // Update the team
        movedPlayer.team = destTeam
      }
    } else {
      // Reordering within the same team
      const teamPlayers = sourceTeam === 1 ? team1Players : team2Players

      // Remove the player from the current position
      const [removed] = teamPlayers.splice(source.index, 1)

      // Insert at the new position
      teamPlayers.splice(destination.index, 0, removed)
    }

    // Update the state with the new order
    setTeamPlayers([...newTeamPlayers.filter((p) => p.team !== 1 && p.team !== 2), ...team1Players, ...team2Players])
  }

  // Helper function to display positions
  const getPositionBadges = (positions: string[], assignedPosition?: string) => {
    // If we have an assigned position from AI, show that
    if (assignedPosition) {
      const positionLabels: Record<string, string> = {
        arquero: "Arco",
        defensor: "Defensa",
        mediocampo: "Medio",
        delantero: "Delantero",
      }

      return (
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
            IA: {positionLabels[assignedPosition] || assignedPosition}
          </Badge>
        </div>
      )
    }

    // Otherwise show regular positions
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
    arco: team1Players.filter((p) => p.assignedPosition === "arquero" || (p.positions && p.positions.includes("arco")))
      .length,
    defensa: team1Players.filter(
      (p) => p.assignedPosition === "defensor" || (p.positions && p.positions.includes("defensa")),
    ).length,
    medio: team1Players.filter(
      (p) => p.assignedPosition === "mediocampo" || (p.positions && p.positions.includes("medio")),
    ).length,
    delantero: team1Players.filter(
      (p) => p.assignedPosition === "delantero" || (p.positions && p.positions.includes("delantero")),
    ).length,
  }

  const team2Positions = {
    arco: team2Players.filter((p) => p.assignedPosition === "arquero" || (p.positions && p.positions.includes("arco")))
      .length,
    defensa: team2Players.filter(
      (p) => p.assignedPosition === "defensor" || (p.positions && p.positions.includes("defensa")),
    ).length,
    medio: team2Players.filter(
      (p) => p.assignedPosition === "mediocampo" || (p.positions && p.positions.includes("medio")),
    ).length,
    delantero: team2Players.filter(
      (p) => p.assignedPosition === "delantero" || (p.positions && p.positions.includes("delantero")),
    ).length,
  }

  return (
    <div className="container py-6 px-2 md:py-10 md:px-6 max-w-full md:max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 md:mb-6 gap-3">
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2 w-full sm:w-auto">
          <ArrowLeft className="h-4 w-4" />
          Volver al Partido
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleShareTeams} className="bg-green-600 hover:bg-green-700 flex-1 sm:flex-auto">
            <Share2 className="mr-2 h-4 w-4" />
            Compartir Equipos
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="manual">
          <div className="mb-4 bg-green-50 p-3 rounded-lg border border-green-200 text-center text-sm text-green-700">
            <div className="flex justify-between items-center">
              <p>Equipos generados aleatoriamente. Arrastra y suelta para reordenar.</p>
              <Button
                onClick={handleRegenerateTeams}
                disabled={isGenerating}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isGenerating ? "Generando..." : "Armar de Nuevo"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <div className="mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200 text-center text-sm text-blue-700">
            <div className="flex justify-between items-center">
              <p>Equipos generados con IA Groq basados en habilidades y posiciones de los jugadores.</p>
              <Button
                onClick={generateAITeams}
                disabled={isGeneratingAI}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {isGeneratingAI ? "Generando con IA..." : "Generar con Groq IA"}
              </Button>
            </div>
          </div>

          {/* AI Analysis */}
          {aiTeamData && (
            <div className="mb-6 grid gap-4 md:grid-cols-3">
              <Card className="border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-800">Balance General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{aiTeamData.balanceAnalysis.overallBalance}/10</div>
                  <p className="text-xs text-blue-600 mt-1">{aiTeamData.balanceAnalysis.explanation}</p>
                </CardContent>
              </Card>

              <Card className="border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-800">Equipo 1</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">Formación: {aiTeamData.team1.formation}</p>
                  <div className="mt-2">
                    <p className="text-xs text-green-600">Fortalezas:</p>
                    <ul className="text-xs text-green-600">
                      {aiTeamData.team1.strengths.slice(0, 2).map((strength, i) => (
                        <li key={i}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-blue-800">Equipo 2</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-medium">Formación: {aiTeamData.team2.formation}</p>
                  <div className="mt-2">
                    <p className="text-xs text-green-600">Fortalezas:</p>
                    <ul className="text-xs text-green-600">
                      {aiTeamData.team2.strengths.slice(0, 2).map((strength, i) => (
                        <li key={i}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* AI Team Building Strategy */}
          {aiTeamData && aiTeamData.teamBuildingStrategy && (
            <Card className="mb-6 border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800 flex items-center">
                  <Brain className="mr-2 h-5 w-5" />
                  Estrategia de Formación de Equipos (Groq IA)
                </CardTitle>
                <CardDescription>Análisis detallado del proceso de selección</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Enfoque General:</h4>
                  <p className="text-sm text-blue-700 bg-white p-3 rounded-lg border border-blue-200">
                    {aiTeamData.teamBuildingStrategy.approach}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">Decisiones Clave:</h4>
                    <ul className="space-y-1">
                      {aiTeamData.teamBuildingStrategy.keyDecisions.map((decision, index) => (
                        <li key={index} className="text-sm text-blue-700 bg-white p-2 rounded border border-blue-200">
                          • {decision}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-blue-800 mb-2">Factores Balanceados:</h4>
                    <ul className="space-y-1">
                      {aiTeamData.teamBuildingStrategy.balancingFactors.map((factor, index) => (
                        <li key={index} className="text-sm text-blue-700 bg-white p-2 rounded border border-blue-200">
                          • {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Resultado Esperado:</h4>
                  <p className="text-sm text-blue-700 bg-white p-3 rounded-lg border border-blue-200">
                    {aiTeamData.teamBuildingStrategy.expectedOutcome}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-blue-800 mb-2">Consejos de Entrenamiento:</h4>
                  <div className="grid gap-2 md:grid-cols-2">
                    {aiTeamData.teamBuildingStrategy.coachingTips.map((tip, index) => (
                      <div key={index} className="text-sm text-blue-700 bg-white p-2 rounded border border-blue-200">
                        💡 {tip}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Teams container with drag and drop */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-row space-x-2 md:space-x-6 w-full">
          {/* Team 1 */}
          <Card className="border-green-200 shadow-lg animate-fade-in overflow-hidden w-1/2">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-2 md:p-6">
              <CardTitle className="text-base md:text-2xl text-green-800">Equipo 1</CardTitle>
              <CardDescription className="text-xs md:text-base">{team1Players.length} jugadores</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4">
                {team1Positions.arco > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Arco: {team1Positions.arco}
                  </Badge>
                )}
                {team1Positions.defensa > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Defensa: {team1Positions.defensa}
                  </Badge>
                )}
                {team1Positions.medio > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Medio: {team1Positions.medio}
                  </Badge>
                )}
                {team1Positions.delantero > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Delantero: {team1Positions.delantero}
                  </Badge>
                )}
              </div>

              <Droppable droppableId="team-1">
                {(provided) => (
                  <ul
                    className="space-y-1 md:space-y-3 min-h-[50px]"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {team1Players.map((player, index) => (
                      <Draggable key={player.id} draggableId={player.id} index={index}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              // Ensure the item doesn't change size when dragging
                              width: snapshot.isDragging ? provided.draggableProps.style?.width : "100%",
                            }}
                            className={`flex items-center p-1 md:p-3 bg-white rounded-lg border border-green-100 shadow-sm transition-shadow ${
                              snapshot.isDragging ? "shadow-lg border-green-300 bg-green-50" : "hover:shadow-md"
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="mr-1 md:mr-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                            >
                              <GripVertical className="h-3 w-3 md:h-4 md:w-4" />
                            </div>
                            <div className="flex flex-col flex-grow min-w-0">
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="inline-block w-4 md:w-6 text-green-600 font-bold text-xs md:text-base flex-shrink-0">
                                  {index + 1}.
                                </span>
                                <span className="font-medium text-xs md:text-base truncate">
                                  {player.playerName}
                                  {player.is_guest && <span className="text-xs text-gray-500 ml-1">(Invitado)</span>}
                                </span>
                                {player.hasMeal && <span className="text-xs md:text-sm flex-shrink-0">🍖</span>}
                              </div>
                              <div className="hidden sm:block">
                                {getPositionBadges(player.positions, player.assignedPosition)}
                              </div>
                              {player.reasoning && activeTab === "ai" && (
                                <p className="text-xs text-blue-600 mt-1 hidden md:block">{player.reasoning}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0 md:p-2 ml-auto flex-shrink-0"
                              onClick={() => movePlayerToOtherTeam(player.id)}
                            >
                              <ArrowLeftRight className="h-3 w-3 md:h-5 md:w-5" />
                            </Button>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* Team 2 */}
          <Card className="border-green-200 shadow-lg animate-fade-in overflow-hidden w-1/2">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-green-600"></div>
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 p-2 md:p-6">
              <CardTitle className="text-base md:text-2xl text-green-800">Equipo 2</CardTitle>
              <CardDescription className="text-xs md:text-base">{team2Players.length} jugadores</CardDescription>
            </CardHeader>
            <CardContent className="p-2 md:p-6">
              <div className="flex flex-wrap gap-1 md:gap-2 mb-2 md:mb-4">
                {team2Positions.arco > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Arco: {team2Positions.arco}
                  </Badge>
                )}
                {team2Positions.defensa > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Defensa: {team2Positions.defensa}
                  </Badge>
                )}
                {team2Positions.medio > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Medio: {team2Positions.medio}
                  </Badge>
                )}
                {team2Positions.delantero > 0 && (
                  <Badge variant="outline" className="text-xs md:text-sm bg-green-50 text-green-700 border-green-200">
                    Delantero: {team2Positions.delantero}
                  </Badge>
                )}
              </div>

              <Droppable droppableId="team-2">
                {(provided) => (
                  <ul
                    className="space-y-1 md:space-y-3 min-h-[50px]"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {team2Players.map((player, index) => (
                      <Draggable key={player.id} draggableId={player.id} index={index}>
                        {(provided, snapshot) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              // Ensure the item doesn't change size when dragging
                              width: snapshot.isDragging ? provided.draggableProps.style?.width : "100%",
                            }}
                            className={`flex items-center p-1 md:p-3 bg-white rounded-lg border border-green-100 shadow-sm transition-shadow ${
                              snapshot.isDragging ? "shadow-lg border-green-300 bg-green-50" : "hover:shadow-md"
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="mr-1 md:mr-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0"
                            >
                              <GripVertical className="h-3 w-3 md:h-4 md:w-4" />
                            </div>
                            <div className="flex flex-col flex-grow min-w-0">
                              <div className="flex items-center gap-1 md:gap-2">
                                <span className="inline-block w-4 md:w-6 text-green-600 font-bold text-xs md:text-base flex-shrink-0">
                                  {index + 1}.
                                </span>
                                <span className="font-medium text-xs md:text-base truncate">
                                  {player.playerName}
                                  {player.is_guest && <span className="text-xs text-gray-500 ml-1">(Invitado)</span>}
                                </span>
                                {player.hasMeal && <span className="text-xs md:text-sm flex-shrink-0">🍖</span>}
                              </div>
                              <div className="hidden sm:block">
                                {getPositionBadges(player.positions, player.assignedPosition)}
                              </div>
                              {player.reasoning && activeTab === "ai" && (
                                <p className="text-xs text-blue-600 mt-1 hidden md:block">{player.reasoning}</p>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-0 md:p-2 ml-auto flex-shrink-0"
                              onClick={() => movePlayerToOtherTeam(player.id)}
                            >
                              <ArrowLeftRight className="h-3 w-3 md:h-5 md:w-5" />
                            </Button>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </div>
      </DragDropContext>
    </div>
  )
}

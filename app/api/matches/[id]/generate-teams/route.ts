import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateObject } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"

// Define the schema for the AI response with more flexibility
const teamGenerationSchema = z.object({
  team1: z.object({
    players: z.array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        assignedPosition: z.string(),
        reasoning: z.string(),
      }),
    ),
    formation: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }),
  team2: z.object({
    players: z.array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        assignedPosition: z.string(),
        reasoning: z.string(),
      }),
    ),
    formation: z.string(),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
  }),
  balanceAnalysis: z.object({
    overallBalance: z.number().min(1).max(10),
    explanation: z.string(),
    recommendations: z.array(z.string()),
  }),
  teamBuildingStrategy: z.object({
    approach: z.string(),
    keyDecisions: z.array(z.string()),
    balancingFactors: z.array(z.string()),
    expectedOutcome: z.string(),
    coachingTips: z.array(z.string()),
  }),
})

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    console.log("🚀 Iniciando generación de equipos con IA para partido:", params.id)

    // Get match details
    const match = await sql`
      SELECT * FROM "Match" WHERE id = ${params.id}
    `

    if (match.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    // Get signups for this match (only active players, not waiting or meal-only)
    const signups = await sql`
      SELECT s.*, p.primary_position, p.secondary_position, p.speed, p.control, p.physical_condition, p.attitude
      FROM "Signup" s
      LEFT JOIN "Player" p ON s.player_id = p.id
      WHERE s."matchId" = ${params.id}
      AND s."isWaiting" = false
      AND s."mealOnly" = false
      ORDER BY s."signupTime" ASC
    `

    console.log("📊 Jugadores encontrados para equipos:", signups.length)

    if (signups.length < 2) {
      return NextResponse.json({ error: "Se necesitan al menos 2 jugadores para generar equipos" }, { status: 400 })
    }

    // Create a simple mapping for IDs to make it easier for AI
    const playerMapping: { [key: string]: any } = {}
    const playersData = signups.map((signup, index) => {
      const simpleId = `player_${index + 1}`
      playerMapping[simpleId] = signup

      return {
        playerId: simpleId,
        playerName: signup.playerName,
        isGuest: signup.is_guest,
        primaryPosition: signup.primary_position || "mediocampo",
        secondaryPosition: signup.secondary_position,
        speed: signup.speed || 5,
        control: signup.control || 5,
        physicalCondition: signup.physical_condition || 5,
        attitude: signup.attitude || 5,
        overallRating: Math.round(
          ((signup.speed || 5) + (signup.control || 5) + (signup.physical_condition || 5) + (signup.attitude || 5)) / 4,
        ),
      }
    })

    console.log("🎯 Datos de jugadores preparados:", playersData.length)

    // Calculate team sizes
    const totalPlayers = playersData.length
    const team1Size = Math.floor(totalPlayers / 2)
    const team2Size = totalPlayers - team1Size

    console.log(`⚖️ División de equipos: Equipo 1: ${team1Size} jugadores, Equipo 2: ${team2Size} jugadores`)

    // Create the prompt with all players
    const prompt = `
INSTRUCCIONES IMPORTANTES:
- Debes usar TODOS los ${totalPlayers} jugadores listados abajo
- Equipo 1 debe tener exactamente ${team1Size} jugadores
- Equipo 2 debe tener exactamente ${team2Size} jugadores
- NO puedes omitir ningún jugador
- Cada jugador debe estar en exactamente un equipo

LISTA COMPLETA DE JUGADORES INSCRITOS (${totalPlayers} jugadores):
${playersData
  .map(
    (player, index) => `
${index + 1}. ID: ${player.playerId}
   - Nombre: ${player.playerName} ${player.isGuest ? "(Invitado)" : ""}
   - Posición Principal: ${player.primaryPosition}
   - Posición Secundaria: ${player.secondaryPosition || "Ninguna"}
   - Velocidad: ${player.speed}/10
   - Habilidad: ${player.control}/10
   - Físico: ${player.physicalCondition}/10
   - Actitud: ${player.attitude}/10
   - Rating General: ${player.overallRating}/10`,
  )
  .join("")}

OBJETIVO: Crear dos equipos equilibrados usando TODOS los jugadores listados arriba.

CRITERIOS DE EQUILIBRIO:
1. Distribución equitativa de habilidades (velocidad, control, físico, actitud)
2. Balance de posiciones (arqueros, defensores, mediocampistas, delanteros)
3. Mezcla de jugadores experimentados e invitados
4. Formaciones tácticas apropiadas para cada equipo

FORMATO DE RESPUESTA (JSON válido):
{
  "team1": {
    "players": [
      {
        "playerId": "player_X",
        "playerName": "Nombre exacto del jugador",
        "assignedPosition": "arquero|defensor|mediocampo|delantero",
        "reasoning": "Razón específica para esta asignación"
      }
    ],
    "formation": "Formación táctica (ej: 4-4-2, 4-3-3, etc.)",
    "strengths": ["Fortaleza principal 1", "Fortaleza principal 2", "Fortaleza principal 3"],
    "weaknesses": ["Debilidad potencial 1", "Debilidad potencial 2"]
  },
  "team2": {
    "players": [
      {
        "playerId": "player_Y",
        "playerName": "Nombre exacto del jugador", 
        "assignedPosition": "arquero|defensor|mediocampo|delantero",
        "reasoning": "Razón específica para esta asignación"
      }
    ],
    "formation": "Formación táctica (ej: 4-4-2, 4-3-3, etc.)",
    "strengths": ["Fortaleza principal 1", "Fortaleza principal 2", "Fortaleza principal 3"],
    "weaknesses": ["Debilidad potencial 1", "Debilidad potencial 2"]
  },
  "balanceAnalysis": {
    "overallBalance": 8,
    "explanation": "Análisis detallado del equilibrio entre equipos",
    "recommendations": ["Recomendación táctica 1", "Recomendación táctica 2"]
  },
  "teamBuildingStrategy": {
    "approach": "Descripción del enfoque estratégico utilizado",
    "keyDecisions": ["Decisión clave 1", "Decisión clave 2", "Decisión clave 3"],
    "balancingFactors": ["Factor de equilibrio 1", "Factor de equilibrio 2"],
    "expectedOutcome": "Predicción del resultado del partido",
    "coachingTips": ["Consejo de entrenamiento 1", "Consejo de entrenamiento 2"]
  }
}

VERIFICACIÓN FINAL:
- Equipo 1: ${team1Size} jugadores
- Equipo 2: ${team2Size} jugadores
- Total: ${totalPlayers} jugadores (todos incluidos)

Usa EXACTAMENTE los IDs proporcionados (${playersData.map((p) => p.playerId).join(", ")}).
`

    console.log("🤖 Enviando prompt a Groq IA con todos los jugadores...")

    // Generate teams using Groq AI
    const result = await generateObject({
      model: groq("llama3-8b-8192"),
      schema: teamGenerationSchema,
      prompt: prompt,
      temperature: 0.2, // Even lower temperature for more consistent output
    })

    console.log("✅ Respuesta de IA recibida")
    console.log("📋 Equipo 1 jugadores:", result.object.team1.players.length)
    console.log("📋 Equipo 2 jugadores:", result.object.team2.players.length)
    console.log(
      "📋 Total jugadores asignados:",
      result.object.team1.players.length + result.object.team2.players.length,
    )

    // Verify all players are included
    const assignedPlayerIds = [
      ...result.object.team1.players.map((p) => p.playerId),
      ...result.object.team2.players.map((p) => p.playerId),
    ]
    const originalPlayerIds = playersData.map((p) => p.playerId)

    console.log("🔍 Verificando que todos los jugadores estén incluidos...")
    console.log("IDs originales:", originalPlayerIds)
    console.log("IDs asignados:", assignedPlayerIds)

    // Check for missing players
    const missingPlayers = originalPlayerIds.filter((id) => !assignedPlayerIds.includes(id))
    if (missingPlayers.length > 0) {
      console.warn("⚠️ Jugadores faltantes:", missingPlayers)
    }

    // Convert simple IDs back to real IDs
    const convertedTeams = {
      ...result.object,
      team1: {
        ...result.object.team1,
        players: result.object.team1.players.map((player) => ({
          ...player,
          playerId: playerMapping[player.playerId]?.id || player.playerId,
        })),
      },
      team2: {
        ...result.object.team2,
        players: result.object.team2.players.map((player) => ({
          ...player,
          playerId: playerMapping[player.playerId]?.id || player.playerId,
        })),
      },
    }

    console.log("🔄 Equipos convertidos con IDs reales")
    console.log("✅ Generación de equipos completada exitosamente")

    return NextResponse.json({
      success: true,
      teams: convertedTeams,
      playersAnalyzed: playersData.length,
      team1Size: result.object.team1.players.length,
      team2Size: result.object.team2.players.length,
      totalPlayersAssigned: result.object.team1.players.length + result.object.team2.players.length,
      matchId: params.id,
      provider: "groq",
      model: "llama3-8b-8192",
    })
  } catch (error) {
    console.error("❌ Error al generar equipos con Groq IA:", error)

    if (error instanceof Error) {
      console.error("Error message:", error.message)
      console.error("Error stack:", error.stack)
    }

    return NextResponse.json(
      {
        error: "Error al generar equipos con IA",
        details: error instanceof Error ? error.message : "Error desconocido",
        provider: "groq",
      },
      { status: 500 },
    )
  }
}

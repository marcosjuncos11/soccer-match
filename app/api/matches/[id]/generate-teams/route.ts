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

    // Helper function to suggest formations based on team size
    const getFormationSuggestions = (teamSize: number) => {
      switch (teamSize) {
        case 3:
          return ["1-1-1", "2-1", "1-2"]
        case 4:
          return ["1-2-1", "2-2", "1-1-2"]
        case 5:
          return ["1-2-2", "1-3-1", "2-2-1"]
        case 6:
          return ["1-2-3", "1-3-2", "2-2-2"]
        case 7:
          return ["1-3-3", "1-2-4", "2-3-2"]
        case 8:
          return ["1-3-4", "1-4-3", "2-3-3"]
        case 9:
          return ["1-4-4", "1-3-5", "2-4-3"]
        case 10:
          return ["1-4-5", "1-5-4", "2-4-4"]
        case 11:
          return ["1-4-4-2", "1-4-3-3", "1-3-5-2"]
        default:
          if (teamSize <= 2) return [`${teamSize}-0`]
          return [`1-${Math.floor((teamSize - 1) / 2)}-${Math.ceil((teamSize - 1) / 2)}`]
      }
    }

    const team1Formations = getFormationSuggestions(team1Size)
    const team2Formations = getFormationSuggestions(team2Size)

    // Create the prompt with all players
    const prompt = `

Eres un seleccionador de equipos de futbol/soccer profesional. Tu objetivo es distribuir jugadores en 2 equipos de manera balanceada, RESPETANDO ESTRICTAMENTE las posiciones naturales de cada jugador.

REGLAS FUNDAMENTALES DE POSICIONES:
1. NUNCA asignes un jugador a una posición que no sea su posición principal o secundaria
2. Un jugador de "mediocampo" NUNCA puede ser asignado como "arquero"
3. Un jugador de "delantero" NUNCA puede ser asignado como "arquero"
4. Un jugador de "defensor" NUNCA puede ser asignado como "arquero"
5. Solo jugadores con posición "arquero" pueden ser asignados como "arquero"
6. SIEMPRE prioriza la posición principal del jugador
7. Solo usa la posición secundaria si es absolutamente necesario para el balance

INSTRUCCIONES IMPORTANTES:
- Es un partido de soccer
- Debes usar TODOS los ${totalPlayers} jugadores listados abajo
- Equipo 1 debe tener exactamente ${team1Size} jugadores
- Equipo 2 debe tener exactamente ${team2Size} jugadores
- NO puedes omitir ningún jugador
- Cada jugador debe estar en exactamente un equipo
- RESPETA ESTRICTAMENTE las posiciones de cada jugador

FORMACIONES APROPIADAS:
- Para Equipo 1 (${team1Size} jugadores): ${team1Formations.join(", ")}
- Para Equipo 2 (${team2Size} jugadores): ${team2Formations.join(", ")}

IMPORTANTE: La formación debe coincidir EXACTAMENTE con el número de jugadores en cada equipo.
Formato de formación: Arquero-Defensores-Mediocampistas-Delanteros (ej: 1-2-1 para 4 jugadores)

LISTA COMPLETA DE JUGADORES INSCRITOS (${totalPlayers} jugadores):
${playersData
  .map(
    (player, index) => `
${index + 1}. ID: ${player.playerId}
   - Nombre: ${player.playerName} ${player.isGuest ? "(Invitado)" : ""}
   - Posición Principal: ${player.primaryPosition} ← DEBE SER RESPETADA
   - Posición Secundaria: ${player.secondaryPosition || "Ninguna"} ← Solo usar si es necesario
   - Velocidad: ${player.speed}/10
   - Habilidad: ${player.control}/10
   - Físico: ${player.physicalCondition}/10
   - Actitud: ${player.attitude}/10
   - Rating General: ${player.overallRating}/10`,
  )
  .join("")}

OBJETIVO: Crear dos equipos equilibrados usando TODOS los jugadores listados arriba, RESPETANDO sus posiciones naturales.

CRITERIOS DE EQUILIBRIO (en orden de prioridad):
1. RESPETAR las posiciones principales de cada jugador (OBLIGATORIO)
2. Distribución equitativa de habilidades (velocidad, control, físico, actitud)
3. Balance de posiciones apropiado para el número de jugadores
4. Mezcla de jugadores experimentados e invitados
5. Formaciones tácticas realistas para el número de jugadores disponibles

REGLAS DE ASIGNACIÓN DE POSICIONES:
- Si un jugador tiene posición principal "arquero" → assignedPosition: "arquero"
- Si un jugador tiene posición principal "defensor" → assignedPosition: "defensor"
- Si un jugador tiene posición principal "mediocampo" → assignedPosition: "mediocampo"
- Si un jugador tiene posición principal "delantero" → assignedPosition: "delantero"
- NUNCA cambies la posición principal de un jugador
- Solo usa posición secundaria si no hay suficientes jugadores para una posición específica

DISTRIBUCIÓN DE ARQUEROS:
- Si hay 1 arquero: asignarlo al equipo más grande
- Si hay 2+ arqueros: distribuir entre equipos
- Si NO hay arqueros: el equipo más grande juega sin arquero dedicado, usar un defensor

VALIDACIÓN OBLIGATORIA:
Antes de generar la respuesta, verifica que:
- Ningún jugador de "mediocampo" esté asignado como "arquero"
- Ningún jugador de "delantero" esté asignado como "arquero"  
- Ningún jugador de "defensor" esté asignado como "arquero"
- Solo jugadores con posición "arquero" estén asignados como "arquero"
- Cada jugador mantenga su posición principal o secundaria

FORMATO DE RESPUESTA (JSON válido):
{
  "team1": {
    "players": [
      {
        "playerId": "player_X",
        "playerName": "Nombre exacto del jugador",
        "assignedPosition": "DEBE SER LA POSICIÓN PRINCIPAL O SECUNDARIA DEL JUGADOR",
        "reasoning": "Explicar por qué se asignó esta posición respetando su posición natural"
      }
    ],
    "formation": "Formación apropiada para ${team1Size} jugadores (ej: ${team1Formations[0]})",
    "strengths": ["Fortaleza principal 1", "Fortaleza principal 2", "Fortaleza principal 3"],
    "weaknesses": ["Debilidad potencial 1", "Debilidad potencial 2"]
  },
  "team2": {
    "players": [
      {
        "playerId": "player_Y",
        "playerName": "Nombre exacto del jugador", 
        "assignedPosition": "DEBE SER LA POSICIÓN PRINCIPAL O SECUNDARIA DEL JUGADOR",
        "reasoning": "Explicar por qué se asignó esta posición respetando su posición natural"
      }
    ],
    "formation": "Formación apropiada para ${team2Size} jugadores (ej: ${team2Formations[0]})",
    "strengths": ["Fortaleza principal 1", "Fortaleza principal 2", "Fortaleza principal 3"],
    "weaknesses": ["Debilidad potencial 1", "Debilidad potencial 2"]
  },
  "balanceAnalysis": {
    "overallBalance": 8,
    "explanation": "Análisis detallado del equilibrio entre equipos, explicando cómo se respetaron las posiciones naturales",
    "recommendations": ["Recomendación táctica 1", "Recomendación táctica 2"]
  },
  "teamBuildingStrategy": {
    "approach": "Descripción del enfoque estratégico respetando las posiciones naturales de los jugadores",
    "keyDecisions": ["Decisión clave 1", "Decisión clave 2", "Decisión clave 3"],
    "balancingFactors": ["Respeto a posiciones naturales", "Factor de equilibrio 2"],
    "expectedOutcome": "Predicción del resultado considerando las posiciones respetadas",
    "coachingTips": ["Consejo basado en posiciones naturales 1", "Consejo basado en posiciones naturales 2"]
  }
}

VERIFICACIÓN FINAL OBLIGATORIA:
- Equipo 1: ${team1Size} jugadores con formación apropiada
- Equipo 2: ${team2Size} jugadores con formación apropiada
- Total: ${totalPlayers} jugadores (todos incluidos)
- TODOS los jugadores mantienen su posición principal o secundaria
- NINGÚN jugador de campo asignado como arquero
- Las formaciones deben sumar exactamente el número de jugadores en cada equipo

Usa EXACTAMENTE los IDs proporcionados (${playersData.map((p) => p.playerId).join(", ")}).

RECUERDA: Es FUNDAMENTAL respetar las posiciones naturales de cada jugador. Un mediocampista NUNCA puede ser arquero.
`

    console.log("🤖 Enviando prompt a IA con formaciones apropiadas...")

    // Generate teams using Groq AI
    const result = await generateObject({
      model: groq("llama3-8b-8192"),
      schema: teamGenerationSchema,
      prompt: prompt,
      temperature: 0.2, // Even lower temperature for more consistent output
    })

    console.log("✅ Respuesta de IA recibida")
    console.log("📋 Equipo 1 jugadores:", result.object.team1.players.length)
    console.log("📋 Equipo 1 formación:", result.object.team1.formation)
    console.log("📋 Equipo 2 jugadores:", result.object.team2.players.length)
    console.log("📋 Equipo 2 formación:", result.object.team2.formation)
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
    console.error("❌ Error al generar equipos con IA:", error)

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

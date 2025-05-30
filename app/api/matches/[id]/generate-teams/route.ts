import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateObject } from "ai"
import { groq } from "@ai-sdk/groq"
import { z } from "zod"

// Define the schema for the AI response
const teamGenerationSchema = z.object({
  team1: z.object({
    players: z.array(
      z.object({
        playerId: z.string(),
        playerName: z.string(),
        assignedPosition: z.enum(["arquero", "defensor", "mediocampo", "delantero"]),
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
        assignedPosition: z.enum(["arquero", "defensor", "mediocampo", "delantero"]),
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

    if (signups.length < 2) {
      return NextResponse.json({ error: "Se necesitan al menos 2 jugadores para generar equipos" }, { status: 400 })
    }

    // Prepare player data for AI
    const playersData = signups.map((signup) => ({
      playerId: signup.id,
      playerName: signup.playerName,
      isGuest: signup.is_guest,
      primaryPosition: signup.primary_position || "mediocampo",
      secondaryPosition: signup.secondary_position,
      speed: signup.speed || 5,
      control: signup.control || 5,
      physicalCondition: signup.physical_condition || 5,
      attitude: signup.attitude || 5,
      // Calculate overall rating
      overallRating: Math.round(
        ((signup.speed || 5) + (signup.control || 5) + (signup.physical_condition || 5) + (signup.attitude || 5)) / 4,
      ),
    }))

    // Create the prompt for AI
    const prompt = `
Eres un entrenador profesional de fútbol encargado de crear dos equipos equilibrados para un partido amistoso.

Aquí están los jugadores disponibles con sus habilidades (calificadas del 1 al 10):

${playersData
  .map(
    (player, index) => `
${index + 1}. ${player.playerName} ${player.isGuest ? "(Guest)" : ""}
   - Primary Position: ${player.primaryPosition}
   - Secondary Position: ${player.secondaryPosition || "None"}
   - Speed: ${player.speed}/10
   - Control: ${player.control}/10
   - Physical Condition: ${player.physicalCondition}/10
   - Attitude: ${player.attitude}/10
   - Overall Rating: ${player.overallRating}/10
`,
  )
  .join("")}

Por favor, crea dos equipos equilibrados considerando:
1. Cobertura de posiciones (cada equipo debe tener al menos un arquero si es posible)
2. Equilibrio de habilidades (distribuir jugadores de alta y baja habilidad de manera uniforme)
3. Equilibrio de atributos físicos
4. Química del equipo y actitud
5. Intenta hacer que los equipos sean lo más parejos posible en términos de fuerza general

Para cada asignación de jugador, proporciona un breve razonamiento de por qué fueron colocados en ese equipo y posición.
También sugiere una formación para cada equipo y analiza el equilibrio general.

IMPORTANTE: Proporciona una estrategia integral de formación de equipos que explique:
- Tu enfoque general para la selección del equipo
- Decisiones clave que tomaste y por qué
- Qué factores equilibraste (habilidades, posiciones, química)
- Qué resultado esperas de estos equipos
- Consejos de entrenamiento para cada equipo

Mapeo de posiciones:
- arquero = portero/guardameta
- defensor = defensa
- mediocampo = centrocampista
- delantero = atacante

Debes responder con JSON válido que coincida con el esquema esperado. Asegúrate de que todos los arrays contengan al menos un elemento y que todos los campos requeridos estén presentes.
`

    // Generate teams using Groq AI with a currently available model
    const result = await generateObject({
      model: groq("llama3-8b-8192"), // Updated to use a currently available model
      schema: teamGenerationSchema,
      prompt: prompt,
      temperature: 0.7,
    })

    return NextResponse.json({
      success: true,
      teams: result.object,
      playersAnalyzed: playersData.length,
      matchId: params.id,
      provider: "groq",
      model: "llama3-8b-8192",
    })
  } catch (error) {
    console.error("Error al generar equipos con Groq IA:", error)
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

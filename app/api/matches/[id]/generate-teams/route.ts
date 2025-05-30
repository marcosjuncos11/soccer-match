import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { generateObject } from "ai"
import { openai } from "@ai-sdk/openai"
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
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
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
      return NextResponse.json({ error: "Need at least 2 players to generate teams" }, { status: 400 })
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
You are a professional soccer coach tasked with creating two balanced teams for a friendly match.

Here are the available players with their skills (rated 1-10):

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

Please create two balanced teams considering:
1. Position coverage (each team should have at least one goalkeeper if possible)
2. Skill balance (distribute high and low skilled players evenly)
3. Physical attributes balance
4. Team chemistry and attitude
5. Try to make teams as even as possible in terms of overall strength

For each player assignment, provide a brief reasoning for why they were placed in that team and position.
Also suggest a formation for each team and analyze the overall balance.

IMPORTANT: Provide a comprehensive team building strategy that explains:
- Your overall approach to team selection
- Key decisions you made and why
- What factors you balanced (skills, positions, chemistry)
- What outcome you expect from these teams
- Coaching tips for each team

Position mapping:
- arquero = goalkeeper
- defensor = defender  
- mediocampo = midfielder
- delantero = forward
`

    // Generate teams using AI
    const result = await generateObject({
      model: openai("gpt-4o"),
      schema: teamGenerationSchema,
      prompt: prompt,
    })

    return NextResponse.json({
      success: true,
      teams: result.object,
      playersAnalyzed: playersData.length,
      matchId: params.id,
    })
  } catch (error) {
    console.error("Error generating teams with AI:", error)
    return NextResponse.json(
      {
        error: "Failed to generate teams with AI",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

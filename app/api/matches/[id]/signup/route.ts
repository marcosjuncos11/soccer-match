import { NextResponse } from "next/server"
import { sql, generateId } from "@/lib/db"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { playerName, mealOnly = false } = await request.json()

    if (!playerName) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })
    }

    // Check if match exists
    const match = await sql`
      SELECT * FROM "Match" WHERE id = ${params.id}
    `

    if (match.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    // Check if player already signed up
    const existingSignup = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id} 
      AND LOWER("playerName") = LOWER(${playerName})
    `

    if (existingSignup.length > 0) {
      return NextResponse.json({ error: "Ya estás inscrito en este partido" }, { status: 400 })
    }

    // For meal-only signups, we don't need to check player limits
    let isWaiting = false

    // Only check player limits for regular signups (not meal-only)
    if (!mealOnly) {
      // Count current non-waiting players
      const currentPlayers = await sql`
        SELECT COUNT(*) as count FROM "Signup" 
        WHERE "matchId" = ${params.id} 
        AND "isWaiting" = false
        AND "mealOnly" = false
      `

      // Determine if player should be on waiting list
      isWaiting = Number.parseInt(currentPlayers[0].count) >= match[0].playerLimit
    }

    const signupId = generateId()

    // Create signup - meal-only signups always have hasMeal=true
    const signup = await sql`
      INSERT INTO "Signup" (id, "matchId", "playerName", "isWaiting", "hasMeal", "mealOnly", "signupTime")
      VALUES (${signupId}, ${params.id}, ${playerName}, ${isWaiting}, ${mealOnly ? true : false}, ${mealOnly}, NOW())
      RETURNING id, "matchId", "playerName", "isWaiting", "hasMeal", "mealOnly", "signupTime"
    `

    return NextResponse.json(signup[0], { status: 201 })
  } catch (error) {
    console.error("Error signing up player:", error)
    return NextResponse.json({ error: "Error al inscribir al jugador" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url)
    const playerName = url.searchParams.get("playerName")

    if (!playerName) {
      return NextResponse.json({ error: "El nombre del jugador es requerido" }, { status: 400 })
    }

    // Find the signup to delete
    const signupToDelete = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id} 
      AND "playerName" = ${playerName}
    `

    if (signupToDelete.length === 0) {
      return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 })
    }

    const wasWaiting = signupToDelete[0].isWaiting
    const wasMealOnly = signupToDelete[0].mealOnly

    // Delete the signup
    await sql`
      DELETE FROM "Signup" 
      WHERE id = ${signupToDelete[0].id}
    `

    // If the deleted player was not on the waiting list and not meal-only, promote the first waiting player
    if (!wasWaiting && !wasMealOnly) {
      const firstWaitingPlayer = await sql`
        SELECT * FROM "Signup" 
        WHERE "matchId" = ${params.id} 
        AND "isWaiting" = true 
        AND "mealOnly" = false
        ORDER BY "signupTime" ASC 
        LIMIT 1
      `

      if (firstWaitingPlayer.length > 0) {
        await sql`
          UPDATE "Signup" 
          SET "isWaiting" = false 
          WHERE id = ${firstWaitingPlayer[0].id}
        `
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing player:", error)
    return NextResponse.json({ error: "Error al eliminar al jugador" }, { status: 500 })
  }
}

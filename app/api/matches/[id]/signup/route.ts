import { NextResponse } from "next/server"
import { sql, generateId } from "@/lib/db"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { playerId, playerName, mealOnly = false, isGuest = false } = await request.json()

    // Validate input
    if (!isGuest && !playerId) {
      return NextResponse.json({ error: "Se requiere seleccionar un jugador" }, { status: 400 })
    }

    if (isGuest && !playerName) {
      return NextResponse.json({ error: "Se requiere el nombre del invitado" }, { status: 400 })
    }

    // Check if match exists
    const match = await sql`
      SELECT * FROM "Match" WHERE id = ${params.id}
    `

    if (match.length === 0) {
      return NextResponse.json({ error: "Partido no encontrado" }, { status: 404 })
    }

    let finalPlayerName = playerName

    // If not a guest, get player info from database
    if (!isGuest && playerId) {
      const player = await sql`
        SELECT * FROM "Player" WHERE id = ${playerId}
      `

      if (player.length === 0) {
        return NextResponse.json({ error: "Jugador no encontrado" }, { status: 404 })
      }

      finalPlayerName = player[0].name

      // Check if this player is already signed up for this match
      const existingSignup = await sql`
        SELECT * FROM "Signup" 
        WHERE "matchId" = ${params.id} 
        AND "player_id" = ${playerId}
      `

      if (existingSignup.length > 0) {
        return NextResponse.json({ error: "Este jugador ya está inscrito en el partido" }, { status: 400 })
      }
    } else {
      // For guests, check if the name is already used
      const existingGuestSignup = await sql`
        SELECT * FROM "Signup" 
        WHERE "matchId" = ${params.id} 
        AND "playerName" = ${finalPlayerName}
        AND "is_guest" = true
      `

      if (existingGuestSignup.length > 0) {
        return NextResponse.json({ error: "Ya hay un invitado con este nombre en el partido" }, { status: 400 })
      }
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

    // Get the highest order value for this category (regular, waiting, or meal-only)
    const maxOrder = await sql`
      SELECT MAX("order") as max_order FROM "Signup"
      WHERE "matchId" = ${params.id}
      AND "isWaiting" = ${isWaiting}
      AND "mealOnly" = ${mealOnly}
    `

    // Calculate the next order value
    const nextOrder = maxOrder[0].max_order ? Number.parseInt(maxOrder[0].max_order) + 1 : 1

    const signupId = generateId()

    // Create signup - meal-only signups always have hasMeal=true
    const signup = await sql`
      INSERT INTO "Signup" (id, "matchId", "playerName", "player_id", "is_guest", "isWaiting", "hasMeal", "mealOnly", "positions", "signupTime", "order")
      VALUES (${signupId}, ${params.id}, ${finalPlayerName}, ${isGuest ? null : playerId}, ${isGuest}, ${isWaiting}, ${mealOnly ? true : false}, ${mealOnly}, ${[]}, NOW(), ${nextOrder})
      RETURNING id, "matchId", "playerName", "player_id", "is_guest", "isWaiting", "hasMeal", "mealOnly", "positions", "signupTime", "order"
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
    const signupId = url.searchParams.get("signupId")

    if (!signupId) {
      return NextResponse.json({ error: "Se requiere el ID de la inscripción" }, { status: 400 })
    }

    // Find the signup to delete
    const signupToDelete = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id} 
      AND id = ${signupId}
    `

    if (signupToDelete.length === 0) {
      return NextResponse.json({ error: "Inscripción no encontrada" }, { status: 404 })
    }

    const wasWaiting = signupToDelete[0].isWaiting
    const wasMealOnly = signupToDelete[0].mealOnly

    // Delete the signup
    await sql`
      DELETE FROM "Signup" 
      WHERE id = ${signupId}
    `

    // If the deleted player was not on the waiting list and not meal-only, promote the first waiting player
    if (!wasWaiting && !wasMealOnly) {
      const firstWaitingPlayer = await sql`
        SELECT * FROM "Signup" 
        WHERE "matchId" = ${params.id} 
        AND "isWaiting" = true 
        AND "mealOnly" = false
        ORDER BY "order" ASC 
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

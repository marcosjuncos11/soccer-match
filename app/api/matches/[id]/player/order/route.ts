import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { playerId } = await request.json()

    if (!playerId) {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 })
    }

    // Get the current player's info
    const currentPlayer = await sql`
      SELECT * FROM "Signup" 
      WHERE id = ${playerId}
      AND "matchId" = ${params.id}
    `

    if (currentPlayer.length === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    const player = currentPlayer[0]
    const isWaiting = player.isWaiting
    const mealOnly = player.mealOnly

    // Get the player above this one (with the next lower order value)
    // We need to filter by the same category (regular player, waiting list, or meal-only)
    const playerAbove = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id}
      AND "isWaiting" = ${isWaiting}
      AND "mealOnly" = ${mealOnly}
      AND "order" < ${player.order || 999999}
      ORDER BY "order" DESC
      LIMIT 1
    `

    if (playerAbove.length === 0) {
      // Already at the top of the list
      return NextResponse.json({ message: "Player is already at the top of the list" })
    }

    // Swap the order values
    await sql`
      UPDATE "Signup"
      SET "order" = ${playerAbove[0].order}
      WHERE id = ${playerId}
    `

    await sql`
      UPDATE "Signup"
      SET "order" = ${player.order}
      WHERE id = ${playerAbove[0].id}
    `

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating player order:", error)
    return NextResponse.json({ error: "Failed to update player order" }, { status: 500 })
  }
}

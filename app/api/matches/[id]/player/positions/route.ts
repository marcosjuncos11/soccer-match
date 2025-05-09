import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { playerId, positions } = await request.json()

    if (!playerId) {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 })
    }

    // Update the player's positions
    const result = await sql`
      UPDATE "Signup" 
      SET "positions" = ${positions}
      WHERE id = ${playerId}
      AND "matchId" = ${params.id}
      RETURNING id, "playerName", "positions"
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating player positions:", error)
    return NextResponse.json({ error: "Failed to update player positions" }, { status: 500 })
  }
}

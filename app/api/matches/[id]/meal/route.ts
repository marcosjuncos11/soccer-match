import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { playerId, hasMeal } = await request.json()

    if (!playerId) {
      return NextResponse.json({ error: "Player ID is required" }, { status: 400 })
    }

    // Update the player's meal status
    const result = await sql`
      UPDATE "Signup" 
      SET "hasMeal" = ${hasMeal}
      WHERE id = ${playerId}
      RETURNING id, "playerName", "hasMeal"
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating meal status:", error)
    return NextResponse.json({ error: "Failed to update meal status" }, { status: 500 })
  }
}

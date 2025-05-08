import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    // Get match details
    const match = await sql`
      SELECT * FROM "Match" WHERE id = ${params.id}
    `

    if (match.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Get signups for this match
    const signups = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id}
      ORDER BY "signupTime" ASC
    `

    // Combine match and signups
    const result = {
      ...match[0],
      signups: signups,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching match:", error)
    return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    // First, delete all signups for this match
    await sql`
      DELETE FROM "Signup" WHERE "matchId" = ${params.id}
    `

    // Then delete the match itself
    const result = await sql`
      DELETE FROM "Match" WHERE id = ${params.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true, message: "Match deleted successfully" })
  } catch (error) {
    console.error("Error deleting match:", error)
    return NextResponse.json({ error: "Failed to delete match" }, { status: 500 })
  }
}

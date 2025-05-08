import { NextResponse } from "next/server"
import { sql, generateId } from "@/lib/db"

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { playerName } = await request.json()

    if (!playerName) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 })
    }

    // Check if match exists
    const match = await sql`
      SELECT * FROM "Match" WHERE id = ${params.id}
    `

    if (match.length === 0) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 })
    }

    // Check if player already signed up
    const existingSignup = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id} 
      AND LOWER("playerName") = LOWER(${playerName})
    `

    if (existingSignup.length > 0) {
      return NextResponse.json({ error: "You are already signed up for this match" }, { status: 400 })
    }

    // Count current non-waiting players
    const currentPlayers = await sql`
      SELECT COUNT(*) as count FROM "Signup" 
      WHERE "matchId" = ${params.id} 
      AND "isWaiting" = false
    `

    // Determine if player should be on waiting list
    const isWaiting = Number.parseInt(currentPlayers[0].count) >= match[0].playerLimit
    const signupId = generateId()

    // Create signup
    const signup = await sql`
      INSERT INTO "Signup" (id, "matchId", "playerName", "isWaiting", "signupTime")
      VALUES (${signupId}, ${params.id}, ${playerName}, ${isWaiting}, NOW())
      RETURNING id, "matchId", "playerName", "isWaiting", "signupTime"
    `

    return NextResponse.json(signup[0], { status: 201 })
  } catch (error) {
    console.error("Error signing up player:", error)
    return NextResponse.json({ error: "Failed to sign up player" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const url = new URL(request.url)
    const playerName = url.searchParams.get("playerName")

    if (!playerName) {
      return NextResponse.json({ error: "Player name is required" }, { status: 400 })
    }

    // Find the signup to delete
    const signupToDelete = await sql`
      SELECT * FROM "Signup" 
      WHERE "matchId" = ${params.id} 
      AND "playerName" = ${playerName}
    `

    if (signupToDelete.length === 0) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 })
    }

    const wasWaiting = signupToDelete[0].isWaiting

    // Delete the signup
    await sql`
      DELETE FROM "Signup" 
      WHERE id = ${signupToDelete[0].id}
    `

    // If the deleted player was not on the waiting list, promote the first waiting player
    if (!wasWaiting) {
      const firstWaitingPlayer = await sql`
        SELECT * FROM "Signup" 
        WHERE "matchId" = ${params.id} 
        AND "isWaiting" = true 
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
    return NextResponse.json({ error: "Failed to remove player" }, { status: 500 })
  }
}

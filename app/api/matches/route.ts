import { NextResponse } from "next/server"
import { sql, generateId } from "@/lib/db"

export async function GET() {
  try {
    // Get all matches ordered by date (older first)
    const matches = await sql`
      SELECT m.*, 
        COUNT(DISTINCT s.id) as "signupCount",
        COUNT(DISTINCT CASE WHEN s."hasMeal" = true OR s."mealOnly" = true THEN s.id END) as "mealCount"
      FROM "Match" m
      LEFT JOIN "Signup" s ON m.id = s."matchId"
      GROUP BY m.id
      ORDER BY m."dateTime" ASC
    `

    // For each match, get the signups to calculate positions
    for (const match of matches) {
      const signups = await sql`
        SELECT * FROM "Signup" WHERE "matchId" = ${match.id}
      `
      match.signups = signups
    }

    return NextResponse.json(matches)
  } catch (error) {
    console.error("Error fetching matches:", error)
    return NextResponse.json({ error: "Failed to fetch matches" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { groupName, dateTime, locationName, playerLimit } = await request.json()

    // Validate required fields
    if (!groupName || !dateTime || !locationName || !playerLimit) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Create new match
    const matchId = generateId()
    const result = await sql`
      INSERT INTO "Match" (id, "groupName", "dateTime", "locationName", "playerLimit", "createdAt", "updatedAt")
      VALUES (${matchId}, ${groupName}, ${dateTime}, ${locationName}, ${playerLimit}, NOW(), NOW())
      RETURNING id, "groupName", "dateTime", "locationName", "playerLimit"
    `

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error("Error creating match:", error)
    return NextResponse.json({ error: "Failed to create match" }, { status: 500 })
  }
}

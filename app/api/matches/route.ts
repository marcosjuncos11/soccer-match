import { NextResponse } from "next/server"
import { sql, generateId } from "@/lib/db"

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

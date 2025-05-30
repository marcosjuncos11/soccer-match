import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: Request) {
  try {
    // Get the CSV data from the request
    const { csvData } = await request.json()

    if (!csvData) {
      return NextResponse.json({ error: "CSV data is required" }, { status: 400 })
    }

    // Parse CSV data
    const lines = csvData.trim().split("\n")
    const headers = lines[0].split(",").map((h: string) => h.trim().replace(/"/g, ""))

    // Clear existing players first
    await sql`DELETE FROM "Player" WHERE id LIKE 'csv_player_%'`

    const players = []

    // Process each line
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v: string) => v.trim().replace(/"/g, ""))

      if (values.length >= headers.length && values[0]) {
        const player = {
          id: `csv_player_${i}`,
          name: values[0],
          primary_position: mapPosition(values[1]),
          secondary_position: values[2] ? mapPosition(values[2]) : null,
          speed: Number.parseInt(values[3]) || 5,
          control: Number.parseInt(values[4]) || 5, // "Habilidad" maps to control
          physical_condition: Number.parseInt(values[5]) || 5, // "Físico" maps to physical_condition
          attitude: Number.parseInt(values[8]) || 5, // "Actitud" maps to attitude
        }

        // Insert player into database
        await sql`
          INSERT INTO "Player" (id, name, primary_position, secondary_position, speed, control, physical_condition, attitude)
          VALUES (${player.id}, ${player.name}, ${player.primary_position}, ${player.secondary_position}, 
                  ${player.speed}, ${player.control}, ${player.physical_condition}, ${player.attitude})
        `

        players.push(player)
      }
    }

    return NextResponse.json({ success: true, imported: players.length, players })
  } catch (error) {
    console.error("Error importing players:", error)
    return NextResponse.json({ error: "Failed to import players" }, { status: 500 })
  }
}

// Helper function to map Spanish positions to database values
function mapPosition(spanishPosition: string): string | null {
  if (!spanishPosition) return null

  const positionMap: Record<string, string> = {
    Mediocampo: "mediocampo",
    Defensor: "defensor",
    Delantero: "delantero",
    Arquero: "arquero",
    Medio: "mediocampo",
    Defensa: "defensor",
  }

  return positionMap[spanishPosition] || "mediocampo" // Default to mediocampo if unknown
}

// Import players from CSV
const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IA%20para%20equipos%20-%20Hoja%202-dMstTMYZfwB0SvJm5QrtZnRHC6RHui.csv"

async function importPlayers() {
  try {
    console.log("Fetching CSV data...")
    const response = await fetch(csvUrl)
    const csvText = await response.text()

    console.log("CSV content preview:")
    console.log(csvText.substring(0, 500) + "...")

    // Generate SQL statements
    console.log("\nGenerating SQL statements...")

    // Parse CSV manually
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

    console.log("Headers:", headers)

    // Generate SQL INSERT statements
    console.log("\n-- Clear existing sample players first")
    console.log("DELETE FROM \"Player\" WHERE id LIKE 'csv_player_%';")
    console.log("\n-- Insert new players from CSV")

    const insertStatements = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))

      if (values.length >= headers.length && values[0]) {
        const name = values[0]
        const primaryPosition = mapPosition(values[1])
        const secondaryPosition = values[2] ? mapPosition(values[2]) : null
        const speed = Number.parseInt(values[3]) || 5
        const control = Number.parseInt(values[4]) || 5 // "Habilidad" maps to control
        const physicalCondition = Number.parseInt(values[5]) || 5 // "Físico" maps to physical_condition
        const attitude = Number.parseInt(values[8]) || 5 // "Actitud" maps to attitude

        const playerId = `csv_player_${i}`
        const secondaryPosValue = secondaryPosition ? `'${secondaryPosition}'` : "NULL"

        const sql = `INSERT INTO "Player" (id, name, primary_position, secondary_position, speed, control, physical_condition, attitude) VALUES ('${playerId}', '${name}', '${primaryPosition}', ${secondaryPosValue}, ${speed}, ${control}, ${physicalCondition}, ${attitude});`

        insertStatements.push(sql)
        console.log(sql)
      }
    }

    console.log(`\nGenerated ${insertStatements.length} INSERT statements`)
  } catch (error) {
    console.error("Error:", error)
  }
}

// Helper function to map Spanish positions to database values
function mapPosition(spanishPosition) {
  if (!spanishPosition) return null

  const positionMap = {
    Mediocampo: "mediocampo",
    Defensor: "defensor",
    Delantero: "delantero",
    Arquero: "arquero",
    Medio: "mediocampo",
    Defensa: "defensor",
  }

  return positionMap[spanishPosition] || "mediocampo" // Default to mediocampo if unknown
}

// Run the import
importPlayers()

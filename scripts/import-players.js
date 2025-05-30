// Fetch and import players from CSV
const csvUrl =
  "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IA%20para%20equipos%20-%20Hoja%202-dMstTMYZfwB0SvJm5QrtZnRHC6RHui.csv"

async function fetchAndImportPlayers() {
  try {
    console.log("Fetching CSV data...")
    const response = await fetch(csvUrl)
    const csvText = await response.text()

    console.log("CSV content preview:")
    console.log(csvText.substring(0, 500) + "...")

    // Parse CSV manually (simple approach)
    const lines = csvText.trim().split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

    console.log("\nHeaders found:", headers)

    const players = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""))

      if (values.length >= headers.length && values[0]) {
        // Skip empty rows
        const player = {
          name: values[0],
          primaryPosition: mapPosition(values[1]),
          secondaryPosition: values[2] ? mapPosition(values[2]) : null,
          speed: Number.parseInt(values[3]) || 5,
          control: Number.parseInt(values[4]) || 5, // "Habilidad" maps to control
          physicalCondition: Number.parseInt(values[5]) || 5, // "Físico" maps to physical_condition
          attitude: Number.parseInt(values[8]) || 5, // "Actitud" maps to attitude
        }

        players.push(player)
      }
    }

    console.log(`\nParsed ${players.length} players:`)
    players.forEach((player, index) => {
      console.log(
        `${index + 1}. ${player.name} - ${player.primaryPosition}${player.secondaryPosition ? "/" + player.secondaryPosition : ""} - Speed:${player.speed} Control:${player.control} Physical:${player.physicalCondition} Attitude:${player.attitude}`,
      )
    })

    // Generate SQL INSERT statements
    console.log("\n--- SQL INSERT STATEMENTS ---")
    console.log("-- Clear existing sample players first")
    console.log("DELETE FROM \"Player\" WHERE id LIKE 'player_%';")
    console.log("\n-- Insert new players from CSV")

    players.forEach((player, index) => {
      const playerId = `csv_player_${index + 1}`
      const secondaryPos = player.secondaryPosition ? `'${player.secondaryPosition}'` : "NULL"

      console.log(
        `INSERT INTO "Player" (id, name, primary_position, secondary_position, speed, control, physical_condition, attitude) VALUES ('${playerId}', '${player.name.replace(/'/g, "''")}', '${player.primaryPosition}', ${secondaryPos}, ${player.speed}, ${player.control}, ${player.physicalCondition}, ${player.attitude});`,
      )
    })

    return players
  } catch (error) {
    console.error("Error fetching or parsing CSV:", error)
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
fetchAndImportPlayers()

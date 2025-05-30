"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface Player {
  id: string
  name: string
  primary_position: string
  secondary_position: string | null
  speed: number
  control: number
  physical_condition: number
  attitude: number
}

export default function PlayersPage() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const fetchPlayers = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/players")

      if (!response.ok) {
        throw new Error("Error al cargar los jugadores")
      }

      const data = await response.json()
      setPlayers(data)
    } catch (error) {
      console.error("Error fetching players:", error)
      setError("Error al cargar los jugadores. Por favor, intenta de nuevo más tarde.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchPlayers()
    }
  }, [isAuthenticated])

  const verifyPassword = () => {
    if (password === "1234") {
      setIsAuthenticated(true)
    } else {
      alert("Contraseña incorrecta")
    }
  }

  const getPositionLabel = (position: string) => {
    const labels: Record<string, string> = {
      delantero: "Delantero",
      arquero: "Arquero",
      defensor: "Defensor",
      mediocampo: "Mediocampo",
    }
    return labels[position] || position
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-md py-10">
        <Card className="border-green-200 shadow-lg">
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Ingresa la contraseña para acceder</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Contraseña"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={verifyPassword} className="w-full">
              Ingresar
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-green-800">Jugadores</h1>
        <div className="flex gap-2">
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/admin/players/import">Importar Jugadores</Link>
          </Button>
          <Button variant="outline" onClick={() => router.push("/")}>
            Volver
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-500 font-medium">{error}</p>
          <Button variant="outline" className="mt-4 border-red-200 text-red-600 hover:bg-red-50" onClick={fetchPlayers}>
            Reintentar
          </Button>
        </div>
      ) : players.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <p className="text-green-700 mb-4">No hay jugadores registrados todavía.</p>
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/admin/players/import">Importar Jugadores</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {players.map((player) => (
            <Card key={player.id} className="border-green-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg text-green-800">{player.name}</CardTitle>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {getPositionLabel(player.primary_position)}
                  </Badge>
                  {player.secondary_position && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {getPositionLabel(player.secondary_position)}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Velocidad</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${player.speed * 10}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right">{player.speed}/10</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Control</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${player.control * 10}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right">{player.control}/10</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Físico</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${player.physical_condition * 10}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right">{player.physical_condition}/10</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Actitud</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${player.attitude * 10}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right">{player.attitude}/10</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

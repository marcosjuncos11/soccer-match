"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2 } from "lucide-react"

export default function ImportPlayersPage() {
  const router = useRouter()
  const [csvData, setCsvData] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string; players?: any[] } | null>(null)
  const [password, setPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleImport = async () => {
    if (!csvData.trim()) return

    setIsImporting(true)
    try {
      const response = await fetch("/api/players/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ csvData }),
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: `Importación exitosa. Se importaron ${data.imported} jugadores.`,
          players: data.players,
        })
      } else {
        setResult({
          success: false,
          message: data.error || "Error al importar jugadores",
        })
      }
    } catch (error) {
      console.error("Error importing players:", error)
      setResult({
        success: false,
        message: "Error al importar jugadores. Por favor, inténtalo de nuevo.",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const handleFetchCSV = async () => {
    try {
      setIsImporting(true)
      const response = await fetch(
        "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/IA%20para%20equipos%20-%20Hoja%202-dMstTMYZfwB0SvJm5QrtZnRHC6RHui.csv",
      )

      if (!response.ok) {
        throw new Error("Error al obtener el archivo CSV")
      }

      const text = await response.text()
      setCsvData(text)
    } catch (error) {
      console.error("Error fetching CSV:", error)
      setResult({
        success: false,
        message: "Error al obtener el archivo CSV. Por favor, inténtalo de nuevo.",
      })
    } finally {
      setIsImporting(false)
    }
  }

  const verifyPassword = () => {
    if (password === "1234") {
      setIsAuthenticated(true)
    } else {
      alert("Contraseña incorrecta")
    }
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
    <div className="container max-w-2xl py-10">
      <Card className="border-green-200 shadow-lg">
        <CardHeader>
          <CardTitle>Importar Jugadores</CardTitle>
          <CardDescription>Importa jugadores desde un archivo CSV</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={handleFetchCSV} disabled={isImporting} className="w-full mb-4">
              Obtener CSV desde URL
            </Button>

            <Textarea
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Pega aquí el contenido del CSV..."
              className="min-h-[200px]"
            />

            {result && (
              <div
                className={`p-4 rounded-md ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}
              >
                <div className="flex items-start">
                  {result.success ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                  )}
                  <div>
                    <p className={result.success ? "text-green-700" : "text-red-700"}>{result.message}</p>

                    {result.success && result.players && (
                      <div className="mt-2">
                        <p className="text-sm text-green-700 font-medium">Jugadores importados:</p>
                        <ul className="mt-1 text-sm text-green-600 max-h-[200px] overflow-y-auto">
                          {result.players.map((player, index) => (
                            <li key={index} className="py-1 border-b border-green-100 last:border-0">
                              {player.name} - {player.primary_position}
                              {player.secondary_position ? `/${player.secondary_position}` : ""}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/")}>
            Volver
          </Button>
          <Button onClick={handleImport} disabled={isImporting || !csvData.trim()}>
            {isImporting ? "Importando..." : "Importar Jugadores"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, LockIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { TimePickerDemo } from "@/components/time-picker"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function CreateMatchPage() {
  const router = useRouter()
  const [groupName, setGroupName] = useState("")
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [time, setTime] = useState<string>("12:00")
  const [locationName, setLocationName] = useState("")
  const [playerLimit, setPlayerLimit] = useState<number>(10)
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null)
  const [shareableLink, setShareableLink] = useState<string | null>(null)
  const [showPasswordDialog, setShowPasswordDialog] = useState(true)
  const [passwordError, setPasswordError] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createMatch()
  }

  const verifyPassword = () => {
    if (password === "1234") {
      setIsAuthenticated(true)
      setShowPasswordDialog(false)
    } else {
      setPasswordError(true)
    }
  }

  const createMatch = async () => {
    setIsSubmitting(true)

    try {
      // Combine date and time
      if (!date) {
        throw new Error("Se requiere una fecha")
      }

      const [hours, minutes] = time.split(":").map(Number)
      const dateTime = new Date(date)
      dateTime.setHours(hours, minutes)

      const response = await fetch("/api/matches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupName,
          dateTime: dateTime.toISOString(),
          locationName,
          playerLimit: Number(playerLimit),
        }),
      })

      if (!response.ok) {
        throw new Error("Error al crear el partido")
      }

      const data = await response.json()
      setCreatedMatchId(data.id)

      // Create shareable link
      const baseUrl = window.location.origin
      const matchLink = `${baseUrl}/match/${data.id}`
      setShareableLink(matchLink)
      setShowShareDialog(true)
    } catch (error) {
      console.error("Error creating match:", error)
      alert("Error al crear el partido. Por favor, inténtalo de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatPlayerList = () => {
    return `*Jugadores (0/${playerLimit}):*\n(Aún no hay jugadores inscritos)`
  }

  const handleShare = () => {
    if (!shareableLink) return

    const message = `¡Se largo la lista, para el asado [0]!\n\n`
    const details = `*${groupName}*\n`
    const dateFormatted = date ? `📅 ${format(date, "PPP 'a las' p", { locale: es })}\n` : ""
    const location = `📍 ${locationName}\n\n`

    // Add the signup link before the player list
    const signupLink = `Anotate acá: ${shareableLink}\n\n`

    const playersList = formatPlayerList()

    const fullMessage = `${message}${details}${dateFormatted}${location}${signupLink}${playersList}`

    window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, "_blank")
  }

  // Redirect to home if not authenticated and dialog is closed
  useEffect(() => {
    if (!showPasswordDialog && !isAuthenticated) {
      router.push("/")
    }
  }, [showPasswordDialog, isAuthenticated, router])

  if (!isAuthenticated && !createdMatchId) {
    return (
      <AlertDialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <AlertDialogContent className="animate-bounce-in">
          <AlertDialogHeader>
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <LockIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center">Acceso Restringido</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Se requiere una contraseña para crear un nuevo partido.
              {passwordError && <p className="text-red-500 mt-2">Contraseña incorrecta. Inténtalo de nuevo.</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError(false)
              }}
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  verifyPassword()
                }
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={verifyPassword}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  return (
    <div className="container max-w-md py-10">
      <Card className="border-green-200 shadow-lg animate-fade-in">
        <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg">
          <CardTitle className="text-green-800">Crear un Nuevo Partido</CardTitle>
          <CardDescription>Configura un nuevo partido de fútbol para tu grupo</CardDescription>
        </CardHeader>
        {!createdMatchId ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <Label htmlFor="groupName" className="text-green-700">
                  Nombre del Grupo
                </Label>
                <Input
                  id="groupName"
                  placeholder="Ingresa el nombre de tu grupo o equipo"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date" className="text-green-700">
                  Fecha
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-green-200",
                        !date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-green-600" />
                      {date ? format(date, "PPP", { locale: es }) : "Selecciona una fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} initialFocus locale={es} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time" className="text-green-700">
                  Hora
                </Label>
                <TimePickerDemo setTime={setTime} time={time} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationName" className="text-green-700">
                  Ubicación
                </Label>
                <Input
                  id="locationName"
                  placeholder="Ingresa la ubicación del partido"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="playerLimit" className="text-green-700">
                  Límite de Jugadores
                </Label>
                <Input
                  id="playerLimit"
                  type="number"
                  min="1"
                  placeholder="Número máximo de jugadores"
                  value={playerLimit}
                  onChange={(e) => setPlayerLimit(Number.parseInt(e.target.value))}
                  required
                  className="border-green-200 focus-visible:ring-green-500"
                />
              </div>
            </CardContent>
            <CardFooter className="bg-gradient-to-r from-green-50 to-green-100 rounded-b-lg">
              <Button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={isSubmitting || !groupName || !date || !locationName || !playerLimit}
              >
                {isSubmitting ? "Creando..." : "Crear Partido"}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4 pt-6">
            <div className="p-4 bg-green-50 text-green-700 rounded-md border border-green-200 animate-pulse">
              <p className="font-medium text-center">¡Partido creado con éxito!</p>
            </div>

            <div className="space-y-2">
              <Label className="text-green-700">Enlace para Compartir</Label>
              <div className="flex gap-2">
                <Input value={shareableLink || ""} readOnly className="border-green-200" />
                <Button
                  variant="outline"
                  className="shrink-0 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink || "")
                    alert("¡Enlace copiado al portapapeles!")
                  }}
                >
                  Copiar
                </Button>
              </div>
            </div>

            <Button
              className="w-full bg-green-600 hover:bg-green-700 transition-all duration-300 transform hover:scale-105"
              onClick={() => setShowShareDialog(true)}
            >
              Compartir por WhatsApp
            </Button>

            <Button
              variant="outline"
              className="w-full border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
              onClick={() => router.push(`/match/${createdMatchId}`)}
            >
              Ver Detalles del Partido
            </Button>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <AlertDialogContent className="animate-bounce-in">
          <AlertDialogHeader>
            <AlertDialogTitle>Compartir por WhatsApp</AlertDialogTitle>
            <AlertDialogDescription>¿Quieres compartir los detalles del partido por WhatsApp?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowShareDialog(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleShare()
                setShowShareDialog(false)
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Compartir por WhatsApp
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

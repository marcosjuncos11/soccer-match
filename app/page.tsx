import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, Share2, Users } from "lucide-react"

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center space-y-8 text-center">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-green-400 to-green-600 rounded-lg blur opacity-25"></div>
          <h1 className="relative text-4xl font-bold tracking-tight text-green-800 bg-white px-4 py-2 rounded-lg">
            Inscripción a Partidos de Fútbol
          </h1>
        </div>
        <p className="text-muted-foreground max-w-[600px] text-lg">
          Crea y gestiona partidos de fútbol para tu equipo o grupo. Haz un seguimiento fácil de quién juega y cuándo.
        </p>
        <div className="flex gap-4">
          <Button
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            <Link href="/create">Crear Partido</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 mt-16 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-green-200 shadow-lg hover:shadow-xl transition-shadow animate-fade-in overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <CalendarIcon className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Crear Partidos</CardTitle>
            </div>
            <CardDescription>Configura nuevos partidos de fútbol para tu grupo</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              Crea fácilmente nuevos partidos con detalles como nombre del grupo, fecha, ubicación y límite de
              jugadores.
            </p>
          </CardContent>
          <CardFooter className="bg-gradient-to-r from-green-50 to-green-100">
            <Button asChild className="w-full bg-green-600 hover:bg-green-700">
              <Link href="/create">Crear Partido</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-green-200 shadow-lg hover:shadow-xl transition-shadow animate-fade-in overflow-hidden delay-100">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <Share2 className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Compartir con Amigos</CardTitle>
            </div>
            <CardDescription>Invita a jugadores por WhatsApp</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              Comparte el enlace de tu partido directamente por WhatsApp para invitar rápidamente a amigos a unirse.
            </p>
          </CardContent>
          <CardFooter className="bg-gradient-to-r from-green-50 to-green-100">
            <Button disabled className="w-full bg-green-600 hover:bg-green-700 opacity-70">
              Compartir Partido
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-green-200 shadow-lg hover:shadow-xl transition-shadow animate-fade-in overflow-hidden delay-200">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-green-100 p-2 rounded-full">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-green-800">Gestionar Inscripciones</CardTitle>
            </div>
            <CardDescription>Lleva un registro de quién juega</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-gray-600">
              Gestiona automáticamente las inscripciones de jugadores, listas de espera y eliminación de jugadores.
            </p>
          </CardContent>
          <CardFooter className="bg-gradient-to-r from-green-50 to-green-100">
            <Button disabled className="w-full bg-green-600 hover:bg-green-700 opacity-70">
              Ver Inscripciones
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Inscripción a Partidos de Fútbol</h1>
        <p className="text-muted-foreground max-w-[600px]">
          Crea y gestiona partidos de fútbol para tu equipo o grupo. Haz un seguimiento fácil de quién juega y cuándo.
        </p>
        <div className="flex gap-4">
          <Button asChild size="lg">
            <Link href="/create">Crear Partido</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 mt-16 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Crear Partidos</CardTitle>
            <CardDescription>Configura nuevos partidos de fútbol para tu grupo</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Crea fácilmente nuevos partidos con detalles como nombre del grupo, fecha, ubicación y límite de
              jugadores.
            </p>
          </CardContent>
          <CardFooter>
            <Button asChild className="w-full">
              <Link href="/create">Crear Partido</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Compartir con Amigos</CardTitle>
            <CardDescription>Invita a jugadores por WhatsApp</CardDescription>
          </CardHeader>
          <CardContent>
            <p>
              Comparte el enlace de tu partido directamente por WhatsApp para invitar rápidamente a amigos a unirse.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Gestionar Inscripciones</CardTitle>
            <CardDescription>Lleva un registro de quién juega</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Gestiona automáticamente las inscripciones de jugadores, listas de espera y eliminación de jugadores.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

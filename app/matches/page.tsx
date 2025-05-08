import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarIcon, Users } from "lucide-react"

// This would typically come from a database
const mockMatches = [
  {
    id: 1,
    groupName: "Sunday League",
    date: "May 12, 2025",
    signups: 8,
  },
  {
    id: 2,
    groupName: "Office Team",
    date: "May 15, 2025",
    signups: 12,
  },
  {
    id: 3,
    groupName: "Neighborhood Pickup",
    date: "May 20, 2025",
    signups: 6,
  },
]

export default function MatchesPage() {
  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Upcoming Matches</h1>
        <Button asChild>
          <Link href="/matches/create">Create Match</Link>
        </Button>
      </div>

      {mockMatches.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">No matches found</p>
          <Button asChild>
            <Link href="/matches/create">Create Your First Match</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockMatches.map((match) => (
            <Card key={match.id}>
              <CardHeader>
                <CardTitle>{match.groupName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-muted-foreground mb-2">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>{match.date}</span>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <Users className="mr-2 h-4 w-4" />
                  <span>{match.signups} players signed up</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full">
                  <Link href={`/matches/${match.id}`}>View Details</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

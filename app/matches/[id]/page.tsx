"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CalendarIcon, MapPin, Users } from "lucide-react"

// This would typically come from a database based on the ID
const mockMatch = {
  id: 1,
  groupName: "Sunday League",
  date: "May 12, 2025",
  location: "Central Park Field #3",
  players: ["John Smith", "Maria Garcia", "David Kim", "Sarah Johnson", "Michael Brown", "Emma Wilson", "James Lee"],
}

export default function MatchDetailPage({ params }: { params: { id: string } }) {
  const [playerName, setPlayerName] = useState("")
  const [players, setPlayers] = useState(mockMatch.players)
  const [isSigningUp, setIsSigningUp] = useState(false)

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSigningUp(true)

    // Simulate API call
    setTimeout(() => {
      setPlayers([...players, playerName])
      setPlayerName("")
      setIsSigningUp(false)
    }, 500)
  }

  return (
    <div className="container py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{mockMatch.groupName}</CardTitle>
            <CardDescription>Match Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5 text-green-600" />
              <span>{mockMatch.date}</span>
            </div>
            <div className="flex items-center">
              <MapPin className="mr-2 h-5 w-5 text-green-600" />
              <span>{mockMatch.location}</span>
            </div>
            <div className="flex items-center">
              <Users className="mr-2 h-5 w-5 text-green-600" />
              <span>{players.length} players signed up</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
            <CardDescription>Join this match</CardDescription>
          </CardHeader>
          <form onSubmit={handleSignup}>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="playerName">Your Name</Label>
                <Input
                  id="playerName"
                  placeholder="Enter your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  required
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isSigningUp || !playerName}>
                {isSigningUp ? "Signing Up..." : "Sign Up for Match"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Player Roster</CardTitle>
          <CardDescription>{players.length} players signed up</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {players.map((player, index) => (
              <li key={index} className="py-2">
                {player}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

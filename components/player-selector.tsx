"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Player {
  id: string
  name: string
  primary_position: string
  secondary_position?: string
}

interface PlayerSelectorProps {
  onPlayerSelect: (playerId: string | null, playerName: string, isGuest: boolean) => void
  disabled?: boolean
  label: string
  placeholder: string
}

export function PlayerSelector({ onPlayerSelect, disabled = false, label, placeholder }: PlayerSelectorProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("")
  const [guestName, setGuestName] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("player")

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    try {
      const response = await fetch("/api/players")
      if (response.ok) {
        const data = await response.json()
        setPlayers(data)
      }
    } catch (error) {
      console.error("Error fetching players:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayerId(playerId)
    const player = players.find((p) => p.id === playerId)
    if (player) {
      onPlayerSelect(playerId, player.name, false)
    }
  }

  const handleGuestNameChange = (name: string) => {
    setGuestName(name)
    onPlayerSelect(null, name, true)
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

  return (
    <div className="space-y-2">
      <Label className="text-green-700">{label}</Label>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="player">Jugador</TabsTrigger>
          <TabsTrigger value="guest">Invitado</TabsTrigger>
        </TabsList>

        <TabsContent value="player" className="space-y-2">
          <Select value={selectedPlayerId} onValueChange={handlePlayerSelect} disabled={disabled || isLoading}>
            <SelectTrigger className="border-green-200 focus:ring-green-500">
              <SelectValue placeholder={isLoading ? "Cargando jugadores..." : "Selecciona un jugador"} />
            </SelectTrigger>
            <SelectContent>
              {players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{player.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {getPositionLabel(player.primary_position)}
                      {player.secondary_position && ` / ${getPositionLabel(player.secondary_position)}`}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TabsContent>

        <TabsContent value="guest" className="space-y-2">
          <Input
            placeholder="Nombre del invitado"
            value={guestName}
            onChange={(e) => handleGuestNameChange(e.target.value)}
            disabled={disabled}
            className="border-green-200 focus-visible:ring-green-500"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

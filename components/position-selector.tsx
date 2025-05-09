"use client"

import { useState, useEffect } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface PositionSelectorProps {
  onChange: (positions: string[]) => void
  initialPositions?: string[]
  disabled?: boolean
}

export function PositionSelector({ onChange, initialPositions = [], disabled = false }: PositionSelectorProps) {
  const [selectedPositions, setSelectedPositions] = useState<string[]>(initialPositions)

  const positions = [
    { id: "arco", label: "Arco" },
    { id: "defensa", label: "Defensa" },
    { id: "medio", label: "Medio" },
    { id: "delantero", label: "Delantero" },
  ]

  useEffect(() => {
    setSelectedPositions(initialPositions)
  }, [initialPositions])

  const handlePositionChange = (position: string, checked: boolean) => {
    let newPositions: string[]

    if (checked) {
      newPositions = [...selectedPositions, position]
    } else {
      newPositions = selectedPositions.filter((p) => p !== position)
    }

    setSelectedPositions(newPositions)
    onChange(newPositions)
  }

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Posiciones</Label>
      <div className="grid grid-cols-2 gap-2">
        {positions.map((position) => (
          <div key={position.id} className="flex items-center space-x-2">
            <Checkbox
              id={`position-${position.id}`}
              checked={selectedPositions.includes(position.id)}
              onCheckedChange={(checked) => handlePositionChange(position.id, checked === true)}
              disabled={disabled}
            />
            <Label htmlFor={`position-${position.id}`} className="text-sm font-normal cursor-pointer">
              {position.label}
            </Label>
          </div>
        ))}
      </div>
    </div>
  )
}

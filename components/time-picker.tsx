"use client"

import type React from "react"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"

interface TimePickerProps {
  time: string
  setTime: (time: string) => void
}

export function TimePickerDemo({ time, setTime }: TimePickerProps) {
  const [hours, setHours] = useState<number>(12)
  const [minutes, setMinutes] = useState<number>(0)

  useEffect(() => {
    if (time) {
      const [h, m] = time.split(":").map(Number)
      if (!isNaN(h) && !isNaN(m)) {
        setHours(h)
        setMinutes(m)
      }
    }
  }, [time])

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHours = Number.parseInt(e.target.value)
    if (!isNaN(newHours) && newHours >= 0 && newHours <= 23) {
      setHours(newHours)
      setTime(`${newHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`)
    }
  }

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = Number.parseInt(e.target.value)
    if (!isNaN(newMinutes) && newMinutes >= 0 && newMinutes <= 59) {
      setMinutes(newMinutes)
      setTime(`${hours.toString().padStart(2, "0")}:${newMinutes.toString().padStart(2, "0")}`)
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <div className="grid gap-1 text-center">
        <Label htmlFor="hours" className="text-xs">
          Horas
        </Label>
        <Input
          id="hours"
          className="w-16 text-center"
          type="number"
          min={0}
          max={23}
          value={hours}
          onChange={handleHoursChange}
        />
      </div>
      <div className="text-xl">:</div>
      <div className="grid gap-1 text-center">
        <Label htmlFor="minutes" className="text-xs">
          Minutos
        </Label>
        <Input
          id="minutes"
          className="w-16 text-center"
          type="number"
          min={0}
          max={59}
          value={minutes}
          onChange={handleMinutesChange}
        />
      </div>
    </div>
  )
}

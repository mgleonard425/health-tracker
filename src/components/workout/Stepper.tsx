import { useState, useRef, useEffect } from 'react'
import { Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StepperProps {
  value: number | undefined
  onChange: (value: number) => void
  step?: number
  min?: number
  max?: number
  unit?: string
  label?: string
  size?: 'sm' | 'md'
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unit,
  label,
  size = 'md',
}: StepperProps) {
  const displayValue = value ?? 0
  const buttonSize = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12'
  const textSize = size === 'sm' ? 'text-lg' : 'text-xl'
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [editing])

  function formatValue(v: number): string {
    if (step < 1) {
      // Show enough decimal places to match the step precision
      const decimals = String(step).split('.')[1]?.length ?? 1
      return v.toFixed(decimals)
    }
    return String(v)
  }

  function commitEdit() {
    const parsed = parseFloat(editText)
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)))
    }
    setEditing(false)
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const raw = displayValue - step
            // Round to avoid floating point drift
            const rounded = Math.round(raw * 1000) / 1000
            onChange(Math.max(min, rounded))
          }}
          className={cn(
            buttonSize,
            'rounded-full bg-secondary flex items-center justify-center',
            'active:bg-secondary/70 transition-colors touch-manipulation',
            displayValue <= min && 'opacity-30'
          )}
          disabled={displayValue <= min}
        >
          <Minus className="w-5 h-5" />
        </button>
        <div className="w-16 text-center">
          {editing ? (
            <input
              ref={inputRef}
              type="number"
              inputMode="decimal"
              className="w-full bg-transparent text-center font-bold tabular-nums outline-none border-b-2 border-primary"
              style={{ fontSize: size === 'sm' ? '1.125rem' : '1.25rem' }}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit()
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditText(formatValue(displayValue))
                setEditing(true)
              }}
              className="w-full"
            >
              <span className={cn(textSize, 'font-bold tabular-nums')}>{formatValue(displayValue)}</span>
              {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            const raw = displayValue + step
            const rounded = Math.round(raw * 1000) / 1000
            onChange(Math.min(max, rounded))
          }}
          className={cn(
            buttonSize,
            'rounded-full bg-secondary flex items-center justify-center',
            'active:bg-secondary/70 transition-colors touch-manipulation',
          )}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

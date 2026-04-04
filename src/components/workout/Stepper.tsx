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

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, displayValue - step))}
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
          <span className={cn(textSize, 'font-bold tabular-nums')}>{displayValue}</span>
          {unit && <span className="text-xs text-muted-foreground ml-0.5">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, displayValue + step))}
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

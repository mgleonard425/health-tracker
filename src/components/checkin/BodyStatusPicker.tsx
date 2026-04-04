import { useState } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { BODY_AREAS } from '@/data/workout-templates'
import { cn } from '@/lib/utils'
import type { BodyAreaStatus, SymptomType, Severity } from '@/db'

interface BodyStatusPickerProps {
  value: BodyAreaStatus[]
  onChange: (value: BodyAreaStatus[]) => void
}

const severityColors: Record<Severity, string> = {
  mild: 'bg-yellow-600',
  moderate: 'bg-orange-600',
  severe: 'bg-red-600',
}

export function BodyStatusPicker({ value, onChange }: BodyStatusPickerProps) {
  const [editingArea, setEditingArea] = useState<string | null>(null)

  const getStatusForArea = (areaId: string) => value.find(v => v.area === areaId)

  function handleToggleArea(areaId: string) {
    const existing = getStatusForArea(areaId)
    if (existing) {
      // Remove it
      onChange(value.filter(v => v.area !== areaId))
      setEditingArea(null)
    } else {
      // Start editing
      setEditingArea(areaId)
    }
  }

  function handleSetStatus(areaId: string, type: SymptomType, severity: Severity) {
    const filtered = value.filter(v => v.area !== areaId)
    onChange([...filtered, { area: areaId, type, severity }])
    setEditingArea(null)
  }

  return (
    <div className="space-y-3">
      {/* Active symptoms */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(s => (
            <Badge
              key={s.area}
              variant="secondary"
              className={cn('gap-1', severityColors[s.severity], 'text-white')}
            >
              {s.area.replace(/-/g, ' ')} ({s.type})
              <button type="button" onClick={() => onChange(value.filter(v => v.area !== s.area))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Body area groups */}
      {BODY_AREAS.map(group => (
        <div key={group.group}>
          <span className="text-xs font-medium text-muted-foreground">{group.group}</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {group.areas.map(area => {
              const status = getStatusForArea(area.id)
              return (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleToggleArea(area.id)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-colors touch-manipulation',
                    status
                      ? `${severityColors[status.severity]} text-white`
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {area.name}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {/* Severity picker */}
      {editingArea && (
        <div className="bg-secondary rounded-lg p-3 space-y-2">
          <span className="text-sm font-medium">{editingArea.replace(/-/g, ' ')}</span>
          <div className="space-y-1">
            {(['tightness', 'pain'] as SymptomType[]).map(type => (
              <div key={type} className="flex items-center gap-2">
                <span className="text-xs w-16 capitalize">{type}:</span>
                <div className="flex gap-1">
                  {(['mild', 'moderate', 'severe'] as Severity[]).map(sev => (
                    <button
                      key={sev}
                      type="button"
                      onClick={() => handleSetStatus(editingArea, type, sev)}
                      className={cn(
                        'px-2 py-1 rounded text-xs font-medium transition-colors touch-manipulation',
                        severityColors[sev], 'text-white opacity-70 hover:opacity-100'
                      )}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setEditingArea(null)}
            className="text-xs text-muted-foreground"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

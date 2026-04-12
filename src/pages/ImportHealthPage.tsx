import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import JSZip from 'jszip'
import { format, subDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import type { WorkoutType } from '@/db'

// --- Types ---

interface ParsedWorkout {
  activityType: string
  displayName: string
  startDate: Date
  endDate: Date
  durationMinutes: number
  distanceMeters?: number
  activeCalories?: number
  avgHeartRate?: number
  maxHeartRate?: number
  sourceName?: string
  selected: boolean
}

// --- Apple → App type mapping ---

const appleTypeToWorkoutType: Record<string, WorkoutType> = {
  HKWorkoutActivityTypeRunning: 'run',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'strength-a',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'strength-a',
  HKWorkoutActivityTypeRowing: 'row',
  HKWorkoutActivityTypeIndoorRowing: 'row',
  HKWorkoutActivityTypeYoga: 'yoga-mobility',
  HKWorkoutActivityTypeFlexibility: 'yoga-mobility',
  HKWorkoutActivityTypeMindAndBody: 'yoga-mobility',
}

const appleTypeDisplayNames: Record<string, string> = {
  HKWorkoutActivityTypeRunning: 'Running',
  HKWorkoutActivityTypeWalking: 'Walking',
  HKWorkoutActivityTypeCycling: 'Cycling',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'Strength Training',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'Functional Strength',
  HKWorkoutActivityTypeRowing: 'Rowing',
  HKWorkoutActivityTypeIndoorRowing: 'Indoor Rowing',
  HKWorkoutActivityTypeYoga: 'Yoga',
  HKWorkoutActivityTypeFlexibility: 'Flexibility',
  HKWorkoutActivityTypeHighIntensityIntervalTraining: 'HIIT',
  HKWorkoutActivityTypeCooldown: 'Cooldown',
  HKWorkoutActivityTypeCoreTraining: 'Core Training',
  HKWorkoutActivityTypePilates: 'Pilates',
  HKWorkoutActivityTypeSwimming: 'Swimming',
  HKWorkoutActivityTypeElliptical: 'Elliptical',
  HKWorkoutActivityTypeHiking: 'Hiking',
  HKWorkoutActivityTypeStairClimbing: 'Stair Climbing',
}

function displayName(activityType: string): string {
  return appleTypeDisplayNames[activityType] || activityType.replace('HKWorkoutActivityType', '')
}

// --- XML parsing ---

function getAttr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, ''))
  return match ? match[1] : undefined
}

function parseAppleDate(s: string): Date {
  // Apple format: "2024-01-15 07:30:00 -0800"
  return new Date(s)
}

function convertDistance(value: number, unit: string): number {
  if (unit === 'km') return value * 1000
  if (unit === 'mi') return value * 1609.34
  return value // assume meters
}

function extractWorkouts(xml: string, after: Date, before: Date): ParsedWorkout[] {
  const results: ParsedWorkout[] = []
  let idx = 0

  while (true) {
    const tagStart = xml.indexOf('<Workout ', idx)
    if (tagStart === -1) break

    // Find the end of the opening tag (could be self-closing or not)
    const tagEnd = xml.indexOf('>', tagStart)
    if (tagEnd === -1) break

    const openingTag = xml.slice(tagStart, tagEnd + 1)
    const isSelfClosing = openingTag.endsWith('/>')

    // Find the block end
    let blockEnd: number
    if (isSelfClosing) {
      blockEnd = tagEnd + 1
    } else {
      const closeTag = xml.indexOf('</Workout>', tagEnd)
      if (closeTag === -1) break
      blockEnd = closeTag + '</Workout>'.length
    }

    // Quick date filter from opening tag attributes
    const startStr = getAttr(openingTag, 'startDate')
    if (!startStr) { idx = blockEnd; continue }

    const startDate = parseAppleDate(startStr)
    if (startDate < after || startDate > before) { idx = blockEnd; continue }

    // Parse attributes from opening tag
    const activityType = getAttr(openingTag, 'workoutActivityType') || 'Unknown'
    const duration = parseFloat(getAttr(openingTag, 'duration') || '0')
    const endStr = getAttr(openingTag, 'endDate')
    const sourceName = getAttr(openingTag, 'sourceName')

    // Distance from attributes
    let distanceMeters: number | undefined
    const totalDist = getAttr(openingTag, 'totalDistance')
    const totalDistUnit = getAttr(openingTag, 'totalDistanceUnit')
    if (totalDist && totalDistUnit) {
      distanceMeters = convertDistance(parseFloat(totalDist), totalDistUnit)
    }

    // Calories from attributes
    let activeCalories: number | undefined
    const totalCal = getAttr(openingTag, 'totalEnergyBurned')
    if (totalCal) activeCalories = Math.round(parseFloat(totalCal))

    // Parse WorkoutStatistics from the block content (only for non-self-closing)
    let avgHeartRate: number | undefined
    let maxHeartRate: number | undefined

    if (!isSelfClosing) {
      const blockContent = xml.slice(tagEnd + 1, blockEnd)

      // Heart rate stats
      const hrMatch = blockContent.match(/<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierHeartRate"[^>]*\/>/)
      if (hrMatch) {
        const avg = getAttr(hrMatch[0], 'average')
        const max = getAttr(hrMatch[0], 'maximum')
        if (avg) avgHeartRate = Math.round(parseFloat(avg))
        if (max) maxHeartRate = Math.round(parseFloat(max))
      }

      // Override distance from stats if not from attributes
      if (!distanceMeters) {
        const distMatch = blockContent.match(/<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierDistance(?:WalkingRunning|Cycling|Swimming)"[^>]*\/>/)
        if (distMatch) {
          const sum = getAttr(distMatch[0], 'sum')
          const unit = getAttr(distMatch[0], 'unit')
          if (sum && unit) distanceMeters = convertDistance(parseFloat(sum), unit)
        }
      }

      // Override calories from stats
      if (!activeCalories) {
        const calMatch = blockContent.match(/<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*\/>/)
        if (calMatch) {
          const sum = getAttr(calMatch[0], 'sum')
          if (sum) activeCalories = Math.round(parseFloat(sum))
        }
      }
    }

    results.push({
      activityType,
      displayName: displayName(activityType),
      startDate,
      endDate: endStr ? parseAppleDate(endStr) : new Date(startDate.getTime() + duration * 60000),
      durationMinutes: Math.round(duration),
      distanceMeters,
      activeCalories,
      avgHeartRate,
      maxHeartRate,
      sourceName,
      selected: true,
    })

    idx = blockEnd
  }

  return results.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())
}

// --- Component ---

type Step = 'upload' | 'parsing' | 'preview' | 'importing' | 'done'

export function ImportHealthPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [progress, setProgress] = useState('')
  const [workouts, setWorkouts] = useState<ParsedWorkout[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [daysBack, setDaysBack] = useState(7)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setStep('parsing')
    setError('')

    try {
      let xmlText: string

      if (file.name.endsWith('.zip')) {
        setProgress('Extracting zip file...')
        const zip = await JSZip.loadAsync(file)
        const xmlFile = zip.file('apple_health_export/export.xml') || zip.file('export.xml')
        if (!xmlFile) {
          setError('Could not find export.xml in the zip file.')
          setStep('upload')
          return
        }
        setProgress('Reading health data (this may take a moment)...')
        xmlText = await xmlFile.async('string')
      } else {
        setProgress('Reading XML file...')
        xmlText = await file.text()
      }

      setProgress('Scanning for workouts...')
      const cutoff = subDays(new Date(), daysBack)
      cutoff.setHours(0, 0, 0, 0)
      const found = extractWorkouts(xmlText, cutoff, new Date())

      if (found.length === 0) {
        setError(`No workouts found in the last ${daysBack} days.`)
        setStep('upload')
        return
      }

      setWorkouts(found)
      setStep('preview')
    } catch (e) {
      setError(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`)
      setStep('upload')
    }
  }

  async function handleImport() {
    setStep('importing')
    const selected = workouts.filter(w => w.selected)
    let count = 0

    for (const w of selected) {
      const dateStr = format(w.startDate, 'yyyy-MM-dd')
      const workoutType = appleTypeToWorkoutType[w.activityType] || 'custom'

      // Check for duplicate: same date + start time within 2 minutes
      const existing = await db.watchMetrics
        .where('date').equals(dateStr)
        .toArray()
      const isDuplicate = existing.some(e => {
        const diff = Math.abs(new Date(e.startTime).getTime() - w.startDate.getTime())
        return diff < 2 * 60 * 1000
      })
      if (isDuplicate) continue

      // Create a Workout entry
      const workoutId = await db.workouts.add({
        date: dateStr,
        type: workoutType,
        startedAt: w.startDate.toISOString(),
        completedAt: w.endDate.toISOString(),
        notes: `Imported from Apple Health · ${w.displayName}`,
      }) as number

      // Create WatchMetrics entry linked to the workout
      await db.watchMetrics.add({
        date: dateStr,
        workoutId,
        watchWorkoutType: w.displayName,
        startTime: w.startDate.toISOString(),
        endTime: w.endDate.toISOString(),
        durationMinutes: w.durationMinutes,
        activeCalories: w.activeCalories,
        avgHeartRate: w.avgHeartRate,
        maxHeartRate: w.maxHeartRate,
        distanceMeters: w.distanceMeters,
      })

      // If it's a run, also create a RunDetail
      if (workoutType === 'run' && w.distanceMeters) {
        const miles = w.distanceMeters / 1609.34
        const mins = w.durationMinutes
        await db.runDetails.add({
          workoutId,
          distanceMiles: Math.round(miles * 100) / 100,
          durationMinutes: mins,
          pacePerMile: mins > 0 && miles > 0 ? Math.round((mins / miles) * 60) : undefined,
          runType: 'easy',
          feelScale: 3,
        })
      }

      // If it's a row, create RowDetail
      if (workoutType === 'row') {
        await db.rowDetails.add({
          workoutId,
          durationMinutes: w.durationMinutes,
          distanceMeters: w.distanceMeters,
          avgHeartRate: w.avgHeartRate,
        })
      }

      count++
    }

    setImportedCount(count)
    setStep('done')
  }

  function toggleWorkout(index: number) {
    setWorkouts(prev => prev.map((w, i) => i === index ? { ...w, selected: !w.selected } : w))
  }

  function toggleAll() {
    const allSelected = workouts.every(w => w.selected)
    setWorkouts(prev => prev.map(w => ({ ...w, selected: !allSelected })))
  }

  const selectedCount = workouts.filter(w => w.selected).length

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Import from Apple Health</h1>

      {/* Upload step */}
      {step === 'upload' && (
        <>
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Import workouts from the last</label>
                <div className="flex items-center gap-2 mt-1">
                  {[7, 14, 30, 90].map(d => (
                    <Button
                      key={d}
                      size="sm"
                      variant={daysBack === d ? 'default' : 'outline'}
                      onClick={() => setDaysBack(d)}
                    >
                      {d}d
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  On your iPhone: <strong>Health</strong> → profile picture (top right) → <strong>Export All Health Data</strong> → save the zip file, then upload it here.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".zip,.xml"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFile(file)
                  }}
                />
                <Button className="w-full h-14" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-5 h-5 mr-2" />
                  Choose export.zip
                </Button>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Card className="border-red-500/50">
              <CardContent className="pt-4">
                <p className="text-sm text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Parsing step */}
      {step === 'parsing' && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{progress}</p>
          </CardContent>
        </Card>
      )}

      {/* Preview step */}
      {step === 'preview' && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Found <strong>{workouts.length}</strong> workout{workouts.length !== 1 ? 's' : ''}
            </p>
            <Button size="sm" variant="ghost" onClick={toggleAll}>
              {workouts.every(w => w.selected) ? 'Deselect All' : 'Select All'}
            </Button>
          </div>

          <div className="space-y-2">
            {workouts.map((w, i) => (
              <WorkoutPreviewCard key={i} workout={w} onToggle={() => toggleWorkout(i)} />
            ))}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setStep('upload'); setWorkouts([]) }}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={selectedCount === 0}
              onClick={handleImport}
            >
              Import {selectedCount} Workout{selectedCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </>
      )}

      {/* Importing step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Importing workouts...</p>
          </CardContent>
        </Card>
      )}

      {/* Done step */}
      {step === 'done' && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
            <h2 className="text-lg font-bold">Import Complete</h2>
            <p className="text-sm text-muted-foreground">
              {importedCount} workout{importedCount !== 1 ? 's' : ''} imported
              {importedCount < selectedCount && ` (${selectedCount - importedCount} skipped as duplicates)`}
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => navigate('/history')}>View History</Button>
              <Button variant="outline" onClick={() => navigate('/')}>Go Home</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Workout preview card ---

function WorkoutPreviewCard({ workout, onToggle }: { workout: ParsedWorkout; onToggle: () => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      className={workout.selected ? '' : 'opacity-50'}
      onClick={onToggle}
    >
      <CardContent className="py-3">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={workout.selected}
            onChange={onToggle}
            onClick={e => e.stopPropagation()}
            className="w-4 h-4 rounded accent-primary"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{workout.displayName}</span>
              <Badge variant="secondary" className="text-xs">
                {workout.durationMinutes}m
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {format(workout.startDate, 'EEE, MMM d · h:mm a')}
              {workout.sourceName && ` · ${workout.sourceName}`}
            </div>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setExpanded(!expanded) }}
            className="p-1 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            {workout.activeCalories && <div>Calories: {workout.activeCalories} cal</div>}
            {workout.avgHeartRate && <div>Avg HR: {workout.avgHeartRate} bpm</div>}
            {workout.maxHeartRate && <div>Max HR: {workout.maxHeartRate} bpm</div>}
            {workout.distanceMeters && (
              <div>Distance: {(workout.distanceMeters / 1609.34).toFixed(2)} mi</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

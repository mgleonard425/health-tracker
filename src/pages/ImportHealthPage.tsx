import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, CheckCircle, Loader2, ChevronDown, ChevronUp, Heart, Activity, Moon, Footprints, Flame, Wind } from 'lucide-react'
import JSZip from 'jszip'
import { format, subDays } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { db } from '@/db'
import type { WorkoutType } from '@/db'

// ── Types ──────────────────────────────────────────────────────────

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

interface ParsedHealthDay {
  date: string // YYYY-MM-DD
  restingHeartRate?: number
  heartRateVariability?: number
  sleepDurationMinutes: number
  sleepStages: { deep: number; core: number; rem: number; awake: number }
  vo2Max?: number
  steps: number
  activeCalories: number
}

// ── Apple → App type mapping ───────────────────────────────────────

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

function getDisplayName(activityType: string): string {
  return appleTypeDisplayNames[activityType] || activityType.replace('HKWorkoutActivityType', '')
}

// ── XML helpers ────────────────────────────────────────────────────

function getAttr(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`${name}="([^"]*)"`, ''))
  return match ? match[1] : undefined
}

function parseAppleDate(s: string): Date {
  return new Date(s)
}

function convertDistance(value: number, unit: string): number {
  if (unit === 'km') return value * 1000
  if (unit === 'mi') return value * 1609.34
  return value
}

// ── Workout extraction ─────────────────────────────────────────────

function extractWorkouts(xml: string, after: Date, before: Date): ParsedWorkout[] {
  const results: ParsedWorkout[] = []
  let idx = 0

  while (true) {
    const tagStart = xml.indexOf('<Workout ', idx)
    if (tagStart === -1) break

    const tagEnd = xml.indexOf('>', tagStart)
    if (tagEnd === -1) break

    const openingTag = xml.slice(tagStart, tagEnd + 1)
    const isSelfClosing = openingTag.endsWith('/>')

    let blockEnd: number
    if (isSelfClosing) {
      blockEnd = tagEnd + 1
    } else {
      const closeTag = xml.indexOf('</Workout>', tagEnd)
      if (closeTag === -1) break
      blockEnd = closeTag + '</Workout>'.length
    }

    const startStr = getAttr(openingTag, 'startDate')
    if (!startStr) { idx = blockEnd; continue }

    const startDate = parseAppleDate(startStr)
    if (startDate < after || startDate > before) { idx = blockEnd; continue }

    const activityType = getAttr(openingTag, 'workoutActivityType') || 'Unknown'
    const duration = parseFloat(getAttr(openingTag, 'duration') || '0')
    const endStr = getAttr(openingTag, 'endDate')
    const sourceName = getAttr(openingTag, 'sourceName')

    let distanceMeters: number | undefined
    const totalDist = getAttr(openingTag, 'totalDistance')
    const totalDistUnit = getAttr(openingTag, 'totalDistanceUnit')
    if (totalDist && totalDistUnit) {
      distanceMeters = convertDistance(parseFloat(totalDist), totalDistUnit)
    }

    let activeCalories: number | undefined
    const totalCal = getAttr(openingTag, 'totalEnergyBurned')
    if (totalCal) activeCalories = Math.round(parseFloat(totalCal))

    let avgHeartRate: number | undefined
    let maxHeartRate: number | undefined

    if (!isSelfClosing) {
      const blockContent = xml.slice(tagEnd + 1, blockEnd)

      const hrMatch = blockContent.match(/<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierHeartRate"[^>]*\/>/)
      if (hrMatch) {
        const avg = getAttr(hrMatch[0], 'average')
        const max = getAttr(hrMatch[0], 'maximum')
        if (avg) avgHeartRate = Math.round(parseFloat(avg))
        if (max) maxHeartRate = Math.round(parseFloat(max))
      }

      if (!distanceMeters) {
        const distMatch = blockContent.match(/<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierDistance(?:WalkingRunning|Cycling|Swimming)"[^>]*\/>/)
        if (distMatch) {
          const sum = getAttr(distMatch[0], 'sum')
          const unit = getAttr(distMatch[0], 'unit')
          if (sum && unit) distanceMeters = convertDistance(parseFloat(sum), unit)
        }
      }

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
      displayName: getDisplayName(activityType),
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

// ── Health metrics extraction ──────────────────────────────────────

const HEALTH_RECORD_TYPES = new Set([
  'HKQuantityTypeIdentifierRestingHeartRate',
  'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  'HKCategoryTypeIdentifierSleepAnalysis',
  'HKQuantityTypeIdentifierVO2Max',
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
])

function extractHealthMetrics(xml: string, after: Date, before: Date): ParsedHealthDay[] {
  const days = new Map<string, ParsedHealthDay>()
  let idx = 0

  function getOrCreateDay(dateKey: string): ParsedHealthDay {
    if (!days.has(dateKey)) {
      days.set(dateKey, {
        date: dateKey,
        sleepDurationMinutes: 0,
        sleepStages: { deep: 0, core: 0, rem: 0, awake: 0 },
        steps: 0,
        activeCalories: 0,
      })
    }
    return days.get(dateKey)!
  }

  while (true) {
    const tagStart = xml.indexOf('<Record ', idx)
    if (tagStart === -1) break

    const tagEnd = xml.indexOf('>', tagStart)
    if (tagEnd === -1) break

    const openingTag = xml.slice(tagStart, tagEnd + 1)

    // Advance past this record
    if (openingTag.endsWith('/>')) {
      idx = tagEnd + 1
    } else {
      const closeTag = xml.indexOf('</Record>', tagEnd)
      idx = closeTag === -1 ? tagEnd + 1 : closeTag + '</Record>'.length
    }

    // Quick type check — skip irrelevant records fast
    const typeMatch = openingTag.match(/type="([^"]*)"/)
    if (!typeMatch || !HEALTH_RECORD_TYPES.has(typeMatch[1])) continue

    const type = typeMatch[1]
    const startStr = getAttr(openingTag, 'startDate')
    const endStr = getAttr(openingTag, 'endDate')
    if (!startStr) continue

    const startDate = parseAppleDate(startStr)
    const isSleep = type === 'HKCategoryTypeIdentifierSleepAnalysis'

    // For sleep, attribute to the wake-up day (endDate)
    const recordDate = isSleep && endStr ? parseAppleDate(endStr) : startDate
    if (recordDate < after || recordDate > before) continue

    const dateKey = format(recordDate, 'yyyy-MM-dd')
    const day = getOrCreateDay(dateKey)
    const value = getAttr(openingTag, 'value')

    switch (type) {
      case 'HKQuantityTypeIdentifierRestingHeartRate':
        // Latest value wins (records are chronological)
        if (value) day.restingHeartRate = Math.round(parseFloat(value))
        break

      case 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN':
        if (value) day.heartRateVariability = Math.round(parseFloat(value))
        break

      case 'HKQuantityTypeIdentifierVO2Max':
        if (value) day.vo2Max = Math.round(parseFloat(value) * 10) / 10
        break

      case 'HKQuantityTypeIdentifierStepCount':
        if (value) day.steps += Math.round(parseFloat(value))
        break

      case 'HKQuantityTypeIdentifierActiveEnergyBurned':
        if (value) day.activeCalories += Math.round(parseFloat(value))
        break

      case 'HKCategoryTypeIdentifierSleepAnalysis': {
        if (!endStr) break
        const end = parseAppleDate(endStr)
        const mins = Math.round((end.getTime() - startDate.getTime()) / 60000)
        if (mins <= 0) break

        if (value?.includes('AsleepDeep')) {
          day.sleepStages.deep += mins
          day.sleepDurationMinutes += mins
        } else if (value?.includes('AsleepCore')) {
          day.sleepStages.core += mins
          day.sleepDurationMinutes += mins
        } else if (value?.includes('AsleepREM')) {
          day.sleepStages.rem += mins
          day.sleepDurationMinutes += mins
        } else if (value?.includes('Awake')) {
          day.sleepStages.awake += mins
          // Awake doesn't count toward sleep duration
        } else if (value?.includes('Asleep')) {
          // AsleepUnspecified or generic Asleep
          day.sleepDurationMinutes += mins
        }
        break
      }
    }
  }

  return Array.from(days.values()).sort((a, b) => b.date.localeCompare(a.date))
}

// ── Component ──────────────────────────────────────────────────────

type Step = 'upload' | 'parsing' | 'preview' | 'importing' | 'done'

export function ImportHealthPage() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [progress, setProgress] = useState('')
  const [workouts, setWorkouts] = useState<ParsedWorkout[]>([])
  const [healthDays, setHealthDays] = useState<ParsedHealthDay[]>([])
  const [importedCount, setImportedCount] = useState(0)
  const [healthDaysImported, setHealthDaysImported] = useState(0)
  const [daysBack, setDaysBack] = useState(7)
  const [error, setError] = useState('')
  const [importWorkouts, setImportWorkouts] = useState(true)
  const [importHealth, setImportHealth] = useState(true)

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

      const cutoff = subDays(new Date(), daysBack)
      cutoff.setHours(0, 0, 0, 0)
      const now = new Date()

      setProgress('Scanning for workouts...')
      // Use setTimeout to let the UI update before heavy parsing
      await new Promise(r => setTimeout(r, 50))
      const foundWorkouts = extractWorkouts(xmlText, cutoff, now)

      setProgress('Scanning for health metrics...')
      await new Promise(r => setTimeout(r, 50))
      const foundHealth = extractHealthMetrics(xmlText, cutoff, now)

      if (foundWorkouts.length === 0 && foundHealth.length === 0) {
        setError(`No data found in the last ${daysBack} days.`)
        setStep('upload')
        return
      }

      setWorkouts(foundWorkouts)
      setHealthDays(foundHealth)
      setImportWorkouts(foundWorkouts.length > 0)
      setImportHealth(foundHealth.length > 0)
      setStep('preview')
    } catch (e) {
      setError(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`)
      setStep('upload')
    }
  }

  async function handleImport() {
    setStep('importing')
    let workoutCount = 0
    let healthCount = 0

    // Import workouts
    if (importWorkouts) {
      const selected = workouts.filter(w => w.selected)
      for (const w of selected) {
        const dateStr = format(w.startDate, 'yyyy-MM-dd')
        const workoutType = appleTypeToWorkoutType[w.activityType] || 'custom'

        const existing = await db.watchMetrics.where('date').equals(dateStr).toArray()
        const isDuplicate = existing.some(e => {
          const diff = Math.abs(new Date(e.startTime).getTime() - w.startDate.getTime())
          return diff < 2 * 60 * 1000
        })
        if (isDuplicate) continue

        const workoutId = await db.workouts.add({
          date: dateStr,
          type: workoutType,
          startedAt: w.startDate.toISOString(),
          completedAt: w.endDate.toISOString(),
          notes: `Imported from Apple Health · ${w.displayName}`,
        }) as number

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

        if (workoutType === 'row') {
          await db.rowDetails.add({
            workoutId,
            durationMinutes: w.durationMinutes,
            distanceMeters: w.distanceMeters,
            avgHeartRate: w.avgHeartRate,
          })
        }

        workoutCount++
      }
    }

    // Import health metrics
    if (importHealth) {
      for (const day of healthDays) {
        // Upsert: check if there's already an entry for this date
        const existing = await db.healthMetrics.where('date').equals(day.date).first()

        const metrics = {
          date: day.date,
          restingHeartRate: day.restingHeartRate,
          heartRateVariability: day.heartRateVariability,
          sleepDurationMinutes: day.sleepDurationMinutes || undefined,
          sleepStages: day.sleepDurationMinutes > 0 ? {
            deep: Math.round(day.sleepStages.deep),
            core: Math.round(day.sleepStages.core),
            rem: Math.round(day.sleepStages.rem),
            awake: Math.round(day.sleepStages.awake),
          } : undefined,
          vo2Max: day.vo2Max,
          steps: day.steps || undefined,
          activeCalories: day.activeCalories || undefined,
        }

        if (existing) {
          await db.healthMetrics.update(existing.id!, metrics)
        } else {
          await db.healthMetrics.add(metrics)
        }
        healthCount++
      }
    }

    setImportedCount(workoutCount)
    setHealthDaysImported(healthCount)
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
                <label className="text-sm font-medium">Import data from the last</label>
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
          {/* Health Metrics Section */}
          {healthDays.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Daily Health Metrics ({healthDays.length} day{healthDays.length !== 1 ? 's' : ''})
                </h2>
                <button
                  onClick={() => setImportHealth(!importHealth)}
                  className={`text-xs px-2 py-1 rounded ${importHealth ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground'}`}
                >
                  {importHealth ? 'Included' : 'Excluded'}
                </button>
              </div>

              <div className={importHealth ? '' : 'opacity-40'}>
                {healthDays.map(day => (
                  <HealthDayCard key={day.date} day={day} />
                ))}
              </div>
            </div>
          )}

          {/* Workouts Section */}
          {workouts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Workouts ({workouts.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setImportWorkouts(!importWorkouts)}
                    className={`text-xs px-2 py-1 rounded ${importWorkouts ? 'bg-emerald-600 text-white' : 'bg-secondary text-muted-foreground'}`}
                  >
                    {importWorkouts ? 'Included' : 'Excluded'}
                  </button>
                  {importWorkouts && (
                    <Button size="sm" variant="ghost" onClick={toggleAll}>
                      {workouts.every(w => w.selected) ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </div>

              <div className={importWorkouts ? 'space-y-2' : 'space-y-2 opacity-40'}>
                {workouts.map((w, i) => (
                  <WorkoutPreviewCard key={i} workout={w} onToggle={() => importWorkouts && toggleWorkout(i)} />
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { setStep('upload'); setWorkouts([]); setHealthDays([]) }}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!importHealth && (!importWorkouts || selectedCount === 0)}
              onClick={handleImport}
            >
              Import
            </Button>
          </div>
        </>
      )}

      {/* Importing step */}
      {step === 'importing' && (
        <Card>
          <CardContent className="pt-6 text-center space-y-3">
            <Loader2 className="w-10 h-10 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Importing data...</p>
          </CardContent>
        </Card>
      )}

      {/* Done step */}
      {step === 'done' && (
        <Card>
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
            <h2 className="text-lg font-bold">Import Complete</h2>
            <div className="text-sm text-muted-foreground space-y-1">
              {importedCount > 0 && (
                <p>
                  {importedCount} workout{importedCount !== 1 ? 's' : ''} imported
                  {importWorkouts && importedCount < selectedCount && ` (${selectedCount - importedCount} skipped as duplicates)`}
                </p>
              )}
              {healthDaysImported > 0 && (
                <p>{healthDaysImported} day{healthDaysImported !== 1 ? 's' : ''} of health metrics imported</p>
              )}
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <Button onClick={() => navigate('/')}>Go Home</Button>
              <Button variant="outline" onClick={() => navigate('/history')}>View History</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ── Health day preview card ────────────────────────────────────────

function HealthDayCard({ day }: { day: ParsedHealthDay }) {
  const [expanded, setExpanded] = useState(false)
  const sleepHrs = day.sleepDurationMinutes > 0
    ? `${Math.floor(day.sleepDurationMinutes / 60)}h ${day.sleepDurationMinutes % 60}m`
    : null

  return (
    <Card className="mb-2">
      <CardContent className="py-3">
        <div className="flex items-center justify-between" onClick={() => setExpanded(!expanded)}>
          <span className="text-sm font-medium">{format(new Date(day.date + 'T12:00:00'), 'EEE, MMM d')}</span>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {day.restingHeartRate && (
              <span className="flex items-center gap-1">
                <Heart className="w-3 h-3 text-red-400" />{day.restingHeartRate}
              </span>
            )}
            {day.heartRateVariability && (
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-violet-400" />{day.heartRateVariability}ms
              </span>
            )}
            {sleepHrs && (
              <span className="flex items-center gap-1">
                <Moon className="w-3 h-3 text-blue-400" />{sleepHrs}
              </span>
            )}
            <button className="p-0.5">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-2 pt-2 border-t border-border grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            {day.restingHeartRate && (
              <div className="flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-red-400" />
                Resting HR: {day.restingHeartRate} bpm
              </div>
            )}
            {day.heartRateVariability && (
              <div className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-violet-400" />
                HRV: {day.heartRateVariability} ms
              </div>
            )}
            {sleepHrs && (
              <div className="flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-blue-400" />
                Sleep: {sleepHrs}
              </div>
            )}
            {day.sleepDurationMinutes > 0 && (
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="ml-5">
                  Deep {Math.round(day.sleepStages.deep)}m · Core {Math.round(day.sleepStages.core)}m · REM {Math.round(day.sleepStages.rem)}m
                </span>
              </div>
            )}
            {day.steps > 0 && (
              <div className="flex items-center gap-1.5">
                <Footprints className="w-3.5 h-3.5 text-emerald-400" />
                Steps: {day.steps.toLocaleString()}
              </div>
            )}
            {day.activeCalories > 0 && (
              <div className="flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                Active Cal: {day.activeCalories.toLocaleString()}
              </div>
            )}
            {day.vo2Max && (
              <div className="flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-cyan-400" />
                VO2 Max: {day.vo2Max}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Workout preview card ───────────────────────────────────────────

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

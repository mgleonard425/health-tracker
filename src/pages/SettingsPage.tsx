import { useState } from 'react'
import { ArrowLeft, Download, Key, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/db'

export function SettingsPage() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState(localStorage.getItem('calorieninjas_api_key') || '')
  const [saved, setSaved] = useState(false)

  function handleSaveApiKey() {
    if (apiKey.trim()) {
      localStorage.setItem('calorieninjas_api_key', apiKey.trim())
    } else {
      localStorage.removeItem('calorieninjas_api_key')
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleExportJSON() {
    const data = {
      exportDate: new Date().toISOString(),
      workouts: await db.workouts.toArray(),
      exerciseSets: await db.exerciseSets.toArray(),
      runDetails: await db.runDetails.toArray(),
      rowDetails: await db.rowDetails.toArray(),
      yogaMobilityDetails: await db.yogaMobilityDetails.toArray(),
      dailyCheckIns: await db.dailyCheckIns.toArray(),
      mealLogs: await db.mealLogs.toArray(),
      favoriteMeals: await db.favoriteMeals.toArray(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `health-tracker-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportCSV() {
    const workouts = await db.workouts.toArray()
    const headers = ['id', 'date', 'type', 'startedAt', 'completedAt', 'notes']
    const rows = workouts.map(w =>
      headers.map(h => JSON.stringify((w as unknown as Record<string, unknown>)[h] ?? '')).join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `workouts-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleClearData() {
    if (!confirm('This will delete ALL your data. Are you sure?')) return
    if (!confirm('Really? This cannot be undone.')) return
    await db.delete()
    window.location.reload()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      {/* API Key */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">CalorieNinjas API Key</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Free signup at calorieninjas.com for food search. 10,000 calls/month.
          </p>
          <div className="flex gap-2">
            <Input
              type="password"
              value={apiKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="flex-1"
            />
            <Button size="sm" onClick={handleSaveApiKey}>
              {saved ? '✓ Saved' : 'Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Export Data</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleExportJSON}>
              Export JSON
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900">
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-red-500" />
            <h2 className="font-medium text-sm text-red-500">Danger Zone</h2>
          </div>
          <Button variant="destructive" className="w-full" onClick={handleClearData}>
            Delete All Data
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

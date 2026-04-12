import { useState } from 'react'
import { ArrowLeft, Download, Key, Trash2, Watch, Cloud, Copy, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { db } from '@/db'
import {
  isSyncEnabled, setSyncEnabled, getSyncToken, generateSyncToken,
  getLastSyncTime, syncToCloud,
} from '@/lib/sync'

export function SettingsPage() {
  const navigate = useNavigate()
  const [apiKey, setApiKey] = useState(localStorage.getItem('calorieninjas_api_key') || '')
  const [saved, setSaved] = useState(false)

  // Cloud sync state
  const [syncEnabled, setSyncEnabledState] = useState(isSyncEnabled())
  const [syncToken, setSyncTokenState] = useState(getSyncToken() || '')
  const [lastSync, setLastSync] = useState(getLastSyncTime())
  const [syncing, setSyncing] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleToggleSync() {
    if (!syncEnabled) {
      // Enable: generate token if needed
      let token = getSyncToken()
      if (!token) {
        token = generateSyncToken()
      }
      setSyncEnabled(true)
      setSyncEnabledState(true)
      setSyncTokenState(token)
    } else {
      setSyncEnabled(false)
      setSyncEnabledState(false)
    }
  }

  async function handleSyncNow() {
    setSyncing(true)
    await syncToCloud()
    setLastSync(getLastSyncTime())
    setSyncing(false)
  }

  function handleCopyToken() {
    navigator.clipboard.writeText(syncToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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

      {/* Cloud Sync */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-medium text-sm">Cloud Sync</h2>
            </div>
            <button
              type="button"
              onClick={handleToggleSync}
              className={`relative w-11 h-6 rounded-full transition-colors ${syncEnabled ? 'bg-emerald-600' : 'bg-secondary'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${syncEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Sync your data to the cloud so your Claude planning agent can access it via MCP.
          </p>
          {syncEnabled && (
            <>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Sync Token (for MCP config)</span>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={syncToken}
                    className="flex-1 font-mono text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={handleCopyToken}>
                    <Copy className="w-3.5 h-3.5 mr-1" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {lastSync ? `Last synced: ${new Date(lastSync).toLocaleString()}` : 'Never synced'}
                </span>
                <Button size="sm" variant="outline" onClick={handleSyncNow} disabled={syncing}>
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-3 space-y-1">
                <p className="font-medium text-foreground">MCP Setup:</p>
                <p>Add this to your Claude Desktop or claude.ai MCP config:</p>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all mt-1">
{`{
  "url": "${window.location.origin}/api/mcp",
  "headers": {
    "Authorization": "Bearer ${syncToken}"
  }
}`}
                </pre>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Apple Watch */}
      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Watch className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">Apple Watch Integration</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Use an iOS Shortcut to send Apple Watch workout data to this app after each workout.
          </p>
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Setup:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open the <strong>Shortcuts</strong> app on your iPhone</li>
              <li>Create a new Shortcut with these actions:</li>
            </ol>
            <div className="bg-secondary rounded-lg p-3 space-y-1 text-xs font-mono">
              <p>1. <strong>Find Health Samples</strong></p>
              <p className="pl-4">Type: Workout</p>
              <p className="pl-4">Sort by: Start Date (Latest First)</p>
              <p className="pl-4">Limit: 1</p>
              <p>2. <strong>Get Contents of URL</strong></p>
              <p className="pl-4">URL: {window.location.origin}/api/watch</p>
              <p className="pl-4">Method: POST</p>
              <p className="pl-4">Body (JSON):</p>
              <p className="pl-6">{`{`}</p>
              <p className="pl-8">"type": [Workout Type],</p>
              <p className="pl-8">"start": [Start Date],</p>
              <p className="pl-8">"end": [End Date],</p>
              <p className="pl-8">"duration": [Duration in min],</p>
              <p className="pl-8">"activeCalories": [Active Energy],</p>
              <p className="pl-8">"avgHeartRate": [Avg Heart Rate]</p>
              <p className="pl-6">{`}`}</p>
              <p>3. <strong>Open URLs</strong></p>
              <p className="pl-4">URL: [Import URL from step 2]</p>
            </div>
            <p>Run this Shortcut after each Apple Watch workout, or set it as an automation triggered when a workout ends.</p>
          </div>
          {syncEnabled && (
            <div className="text-xs text-muted-foreground space-y-2 border-t border-border pt-3">
              <p className="font-medium text-foreground">Daily Health Sync Shortcut (requires Cloud Sync):</p>
              <p>Create a second Shortcut that runs daily (e.g., 7 AM automation) to sync passive health metrics:</p>
              <div className="bg-secondary rounded-lg p-3 space-y-1 text-xs font-mono">
                <p>1. <strong>Find Health Samples</strong> &times; 6:</p>
                <p className="pl-4">- Resting Heart Rate (1 day, Latest)</p>
                <p className="pl-4">- Heart Rate Variability (1 day, Latest)</p>
                <p className="pl-4">- Sleep Analysis (1 day)</p>
                <p className="pl-4">- VO2 Max (1 month, Latest)</p>
                <p className="pl-4">- Steps (1 day, Sum)</p>
                <p className="pl-4">- Active Energy (1 day, Sum)</p>
                <p>2. <strong>Get Contents of URL</strong></p>
                <p className="pl-4">URL: {window.location.origin}/api/sync</p>
                <p className="pl-4">Method: POST</p>
                <p className="pl-4">Headers: Authorization: Bearer {syncToken}</p>
                <p className="pl-4">Body (JSON):</p>
                <p className="pl-6">{`{`}</p>
                <p className="pl-8">"source": "watch-health",</p>
                <p className="pl-8">"date": [Current Date, yyyy-MM-dd],</p>
                <p className="pl-8">"restingHeartRate": [Resting HR],</p>
                <p className="pl-8">"heartRateVariability": [HRV in ms],</p>
                <p className="pl-8">"sleepDurationMinutes": [Sleep duration],</p>
                <p className="pl-8">"vo2Max": [VO2 Max],</p>
                <p className="pl-8">"steps": [Steps],</p>
                <p className="pl-8">"activeCalories": [Active Energy]</p>
                <p className="pl-6">{`}`}</p>
              </div>
              <p>This syncs recovery metrics to the cloud for your planning agent.</p>
            </div>
          )}
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

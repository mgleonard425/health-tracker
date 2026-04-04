import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/db'
import { decodePlan } from '@/lib/plan-sharing'

export function ImportPlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [planName, setPlanName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function importPlan() {
      // Try query param first (?p=...), fall back to hash (#...)
      const encoded = searchParams.get('p') || window.location.hash.slice(1)
      if (!encoded) {
        setStatus('error')
        setErrorMsg('No plan data found in the URL.')
        return
      }

      const plan = decodePlan(encoded)
      if (!plan) {
        setStatus('error')
        setErrorMsg('Could not decode the plan. The link may be corrupted.')
        return
      }

      // Check for duplicate by name
      const existing = await db.workoutPlans.where('name').equals(plan.name).first()
      if (existing) {
        // Update existing plan
        await db.workoutPlans.update(existing.id!, {
          sections: plan.sections,
          generalNotes: plan.generalNotes,
          createdAt: new Date().toISOString(),
        })
      } else {
        await db.workoutPlans.add({
          ...plan,
          createdAt: new Date().toISOString(),
        })
      }

      setPlanName(plan.name)
      setStatus('success')
    }

    importPlan()
  }, [])

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background safe-area-pt">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Importing plan...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
              <h2 className="text-lg font-bold">Plan Imported!</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{planName}</span> has been saved to your workout plans.
              </p>
              <p className="text-xs text-muted-foreground">
                You can close this tab and open the app from your home screen.
              </p>
              <div className="flex flex-col gap-2 pt-2">
                <Button onClick={() => navigate('/plans')}>
                  View Plans
                </Button>
                <Button variant="outline" onClick={() => navigate('/')}>
                  Go to Today
                </Button>
              </div>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="w-12 h-12 mx-auto text-red-500" />
              <h2 className="text-lg font-bold">Import Failed</h2>
              <p className="text-sm text-muted-foreground">{errorMsg}</p>
              <Button variant="outline" onClick={() => navigate('/')}>
                Go Home
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

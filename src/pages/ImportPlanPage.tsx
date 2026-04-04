import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, AlertCircle, Dumbbell, Copy, ClipboardPaste } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { db } from '@/db'
import { decodePlan } from '@/lib/plan-sharing'

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone === true)
}

export function ImportPlanPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'copy-prompt' | 'error'>('loading')
  const [planName, setPlanName] = useState('')
  const [planCode, setPlanCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function importPlan() {
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

      setPlanName(plan.name)
      setPlanCode(encoded)

      if (isStandalone()) {
        // We're inside the PWA — save directly
        const existing = await db.workoutPlans.where('name').equals(plan.name).first()
        if (existing) {
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
        setStatus('success')
      } else {
        // We're in Safari — can't save to PWA storage, prompt to copy
        setStatus('copy-prompt')
      }
    }

    importPlan()
  }, [searchParams])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(planCode)
      setCopied(true)
    } catch {
      // Fallback
      const textarea = document.createElement('textarea')
      textarea.value = planCode
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background safe-area-pt">
      <Card className="w-full max-w-sm">
        <CardContent className="pt-6 text-center space-y-4">
          {status === 'loading' && (
            <>
              <Dumbbell className="w-12 h-12 mx-auto text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Loading plan...</p>
            </>
          )}

          {status === 'copy-prompt' && (
            <>
              <ClipboardPaste className="w-12 h-12 mx-auto text-blue-500" />
              <h2 className="text-lg font-bold">Plan Ready!</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{planName}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Copy the plan code below, then open the app from your home screen and tap <strong>Import from Clipboard</strong> on the Plans page.
              </p>
              <Button onClick={handleCopy} className="w-full" variant={copied ? 'secondary' : 'default'}>
                {copied ? (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Copied!</>
                ) : (
                  <><Copy className="w-4 h-4 mr-2" /> Copy Plan Code</>
                )}
              </Button>
              {copied && (
                <p className="text-xs text-emerald-500 font-medium">
                  Now open Health Tracker from your home screen → Plans → Import from Clipboard
                </p>
              )}
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 mx-auto text-emerald-500" />
              <h2 className="text-lg font-bold">Plan Imported!</h2>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{planName}</span> has been saved.
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

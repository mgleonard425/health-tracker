import type { ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, Dumbbell, BarChart3, Calendar, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: 'Today', icon: Home },
  { path: '/history', label: 'Log', icon: Dumbbell },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart3 },
  { path: '/plan', label: 'Plan', icon: Calendar },
  { path: '/coach', label: 'Coach', icon: MessageSquare },
]

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background safe-area-pt">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border safe-area-pb">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.path)
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 w-16 h-16 rounded-lg transition-colors',
                  'active:bg-accent/50',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

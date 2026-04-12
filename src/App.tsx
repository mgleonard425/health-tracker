import { Routes, Route } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { TodayPage } from '@/pages/TodayPage'
import { WorkoutNewPage } from '@/pages/WorkoutNewPage'
import { WorkoutActivePage } from '@/pages/WorkoutActivePage'
import { CheckInPage } from '@/pages/CheckInPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PlanPage } from '@/pages/PlanPage'
import { HistoryPage } from '@/pages/HistoryPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { WorkoutPlansPage } from '@/pages/WorkoutPlansPage'
import { PlanWorkoutPage } from '@/pages/PlanWorkoutPage'
import { ImportPlanPage } from '@/pages/ImportPlanPage'
import { ImportWatchPage } from '@/pages/ImportWatchPage'
import { ImportHealthPage } from '@/pages/ImportHealthPage'

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/workout/new/:type" element={<WorkoutNewPage />} />
        <Route path="/workout/:id" element={<WorkoutActivePage />} />
        <Route path="/checkin" element={<CheckInPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/plan" element={<PlanPage />} />
        <Route path="/plans" element={<WorkoutPlansPage />} />
        <Route path="/plans/new" element={<PlanWorkoutPage />} />
        <Route path="/plans/edit/:id" element={<PlanWorkoutPage />} />
        <Route path="/import" element={<ImportPlanPage />} />
        <Route path="/import-watch" element={<ImportWatchPage />} />
        <Route path="/import-health" element={<ImportHealthPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppShell>
  )
}

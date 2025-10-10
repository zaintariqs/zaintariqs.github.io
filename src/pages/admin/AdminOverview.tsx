import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { AdminSection } from '@/components/dashboard/AdminSection'
import { WelcomeBonusMonitor } from '@/components/dashboard/WelcomeBonusMonitor'

export default function AdminOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Admin Dashboard
        </h1>
        <p className="text-white/70">
          Manage your Pakistani Rupee Stablecoin system
        </p>
      </div>

      <BalanceCard />
      <WelcomeBonusMonitor />
      <AdminSection />
    </div>
  )
}

import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { AdminSection } from '@/components/dashboard/AdminSection'

export default function AdminOverview() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage your Pakistani Rupee Stablecoin system
        </p>
      </div>

      <BalanceCard />
      <AdminSection />
    </div>
  )
}

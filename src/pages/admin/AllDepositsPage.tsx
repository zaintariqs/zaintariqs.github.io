import { AdminDeposits } from '@/components/dashboard/AdminDeposits'

export default function AllDepositsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          All Deposits
        </h1>
        <p className="text-muted-foreground">
          Review and approve user deposits
        </p>
      </div>

      <AdminDeposits />
    </div>
  )
}

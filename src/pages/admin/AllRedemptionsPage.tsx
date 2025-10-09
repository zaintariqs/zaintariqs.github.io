import { AdminRedemptions } from '@/components/dashboard/AdminRedemptions'

export default function AllRedemptionsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          All Redemptions
        </h1>
        <p className="text-muted-foreground">
          Review and process user redemptions
        </p>
      </div>

      <AdminRedemptions />
    </div>
  )
}

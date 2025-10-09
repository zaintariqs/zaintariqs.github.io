import { TransactionFees } from '@/components/dashboard/TransactionFees'

export default function TransactionFeesPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Transaction Fees
        </h1>
        <p className="text-muted-foreground">
          View collected transaction fees
        </p>
      </div>

      <TransactionFees />
    </div>
  )
}

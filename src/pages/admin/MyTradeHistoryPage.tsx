import { MyTradeHistory } from '@/components/dashboard/MyTradeHistory'

export default function MyTradeHistoryPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          My Trade History
        </h1>
        <p className="text-white/70">
          View your PKRSC trading activity on Uniswap
        </p>
      </div>

      <MyTradeHistory />
    </div>
  )
}
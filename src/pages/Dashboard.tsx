import { useAccount } from 'wagmi'
import PKRHeader from '@/components/PKRHeader'
import PKRFooter from '@/components/PKRFooter'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { TopUpSection } from '@/components/dashboard/TopUpSection'
import { UniswapSection } from '@/components/dashboard/UniswapSection'
import { RedeemSection } from '@/components/dashboard/RedeemSection'
import { Navigate } from 'react-router-dom'

export default function Dashboard() {
  const { isConnected } = useAccount()

  if (!isConnected) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="min-h-screen bg-gradient-dark">
      <PKRHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              PKRSC Dashboard
            </h1>
            <p className="text-muted-foreground">
              Manage your Pakistani Rupee Stablecoin balance and trading
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Balance Section */}
            <div className="lg:col-span-1">
              <BalanceCard />
            </div>

            {/* Actions Section */}
            <div className="lg:col-span-2 space-y-8">
              <TopUpSection />
              <RedeemSection />
              <UniswapSection />
            </div>
          </div>
        </div>
      </main>
      <PKRFooter />
    </div>
  )
}
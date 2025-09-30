import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import PKRHeader from '@/components/PKRHeader'
import PKRFooter from '@/components/PKRFooter'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { TopUpSection } from '@/components/dashboard/TopUpSection'
import { UniswapSection } from '@/components/dashboard/UniswapSection'
import { RedeemSection } from '@/components/dashboard/RedeemSection'
import { AdminSection } from '@/components/dashboard/AdminSection'
import { MarketMakerSection } from '@/components/dashboard/MarketMakerSection'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export default function Dashboard() {
  const { isConnected, address } = useAccount()
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)

  // Check admin status server-side
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!address) {
        setIsAdmin(false)
        setIsCheckingAdmin(false)
        return
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-admin', {
          body: { walletAddress: address }
        })

        if (error) {
          console.error('Error verifying admin status:', error)
          setIsAdmin(false)
        } else {
          setIsAdmin(data?.isAdmin === true)
        }
      } catch (error) {
        console.error('Failed to verify admin status:', error)
        setIsAdmin(false)
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    checkAdminStatus()
  }, [address])

  // Scroll to top when dashboard loads (after login)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  if (!isConnected) {
    return <Navigate to="/" replace />
  }

  if (isCheckingAdmin) {
    return (
      <div className="min-h-screen bg-gradient-dark">
        <PKRHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Verifying access...</p>
            </div>
          </div>
        </main>
      </div>
    )
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

          {isAdmin ? (
            // Top-down layout for admin
            <div className="space-y-8">
              <BalanceCard />
              <AdminSection />
              <MarketMakerSection />
              <UniswapSection />
            </div>
          ) : (
            // Grid layout for regular users
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <BalanceCard />
              </div>
              <div className="lg:col-span-2 space-y-8">
                <TopUpSection />
                <RedeemSection />
                <UniswapSection />
              </div>
            </div>
          )}
        </div>
      </main>
      <PKRFooter />
    </div>
  )
}
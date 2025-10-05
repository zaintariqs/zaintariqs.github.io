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
import { MyDeposits } from '@/components/dashboard/MyDeposits'
import { MyRedemptions } from '@/components/dashboard/MyRedemptions'
import { WhitelistingRequests } from '@/components/dashboard/WhitelistingRequests'
import { AdminDeposits } from '@/components/dashboard/AdminDeposits'
import { AdminRedemptions } from '@/components/dashboard/AdminRedemptions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

          <BalanceCard />

          {isAdmin ? (
            // Admin view with admin sections at top
            <div className="space-y-8">
              <AdminSection />
              <MarketMakerSection />
              <UniswapSection />
              
              <Tabs defaultValue="whitelisting" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="whitelisting">Whitelisting</TabsTrigger>
                  <TabsTrigger value="admin-deposits">All Deposits</TabsTrigger>
                  <TabsTrigger value="admin-redemptions">All Redemptions</TabsTrigger>
                  <TabsTrigger value="deposits">My Deposits</TabsTrigger>
                  <TabsTrigger value="redemptions">My Redemptions</TabsTrigger>
                </TabsList>
                <TabsContent value="whitelisting" className="mt-6">
                  <WhitelistingRequests />
                </TabsContent>
                <TabsContent value="admin-deposits" className="mt-6">
                  <AdminDeposits />
                </TabsContent>
                <TabsContent value="admin-redemptions" className="mt-6">
                  <AdminRedemptions />
                </TabsContent>
                <TabsContent value="deposits" className="mt-6">
                  <MyDeposits />
                </TabsContent>
                <TabsContent value="redemptions" className="mt-6">
                  <MyRedemptions />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // Regular user view with tabs
            <div className="space-y-8">
              <Tabs defaultValue="topup" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="topup">Top-up</TabsTrigger>
                  <TabsTrigger value="redeem">Redeem</TabsTrigger>
                  <TabsTrigger value="deposits">My Deposits</TabsTrigger>
                  <TabsTrigger value="redemptions">My Redemptions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="topup" className="mt-6">
                  <TopUpSection />
                </TabsContent>
                
                <TabsContent value="redeem" className="mt-6">
                  <RedeemSection />
                </TabsContent>
                
                <TabsContent value="deposits" className="mt-6">
                  <MyDeposits />
                </TabsContent>
                
                <TabsContent value="redemptions" className="mt-6">
                  <MyRedemptions />
                </TabsContent>
              </Tabs>

              <UniswapSection />
            </div>
          )}
        </div>
      </main>
      <PKRFooter />
    </div>
  )
}
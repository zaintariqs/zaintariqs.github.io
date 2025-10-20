import { useAccount } from 'wagmi'
import { useEffect, useState } from 'react'
import { Navigate, Routes, Route, useLocation } from 'react-router-dom'
import PKRHeader from '@/components/PKRHeader'
import PKRFooter from '@/components/PKRFooter'
import { BalanceCard } from '@/components/dashboard/BalanceCard'
import { TopUpSection } from '@/components/dashboard/TopUpSection'
import { UniswapSection } from '@/components/dashboard/UniswapSection'
import { BalancerSection } from '@/components/dashboard/BalancerSection'
import { RedeemSection } from '@/components/dashboard/RedeemSection'
import { MyDepositsWrapper } from '@/components/dashboard/MyDepositsWrapper'
import { MyRedemptions } from '@/components/dashboard/MyRedemptions'
import { MyTradeHistory } from '@/components/dashboard/MyTradeHistory'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AdminSidebar } from '@/components/dashboard/AdminSidebar'
import { supabase } from '@/integrations/supabase/client'
import AdminOverview from './admin/AdminOverview'
import MarketMakerPage from './admin/MarketMakerPage'
import UniswapPage from './admin/UniswapPage'
import BalancerPage from './admin/BalancerPage'
import WhitelistingPage from './admin/WhitelistingPage'
import LoginAttemptsPage from './admin/LoginAttemptsPage'
import AllDepositsPage from './admin/AllDepositsPage'
import AllRedemptionsPage from './admin/AllRedemptionsPage'
import TransactionFeesPage from './admin/TransactionFeesPage'
import MyActivityPage from './admin/MyActivityPage'
import UserBalancesPage from './admin/UserBalancesPage'
import CryptoExchangePage from './admin/CryptoExchangePage'
import MyTradeHistoryPage from './admin/MyTradeHistoryPage'
import { CryptoExchangeSection } from '@/components/dashboard/CryptoExchangeSection'

export default function Dashboard() {
  const { isConnected, address } = useAccount()
  const location = useLocation()
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
      
      {isAdmin ? (
        // Admin view with sidebar layout
        <SidebarProvider>
          <div className="flex min-h-[calc(100vh-64px)] w-full">
            <AdminSidebar />
            
            <div className="flex-1 flex flex-col">
              <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                <SidebarTrigger />
                <div className="flex-1" />
              </header>
              
              <main className="flex-1 p-6 overflow-auto">
                <div className="max-w-7xl mx-auto">
                  {location.pathname === '/dashboard' && <AdminOverview />}
                  {location.pathname === '/dashboard/market-maker' && <MarketMakerPage />}
                  {location.pathname === '/dashboard/uniswap' && <UniswapPage />}
                  {location.pathname === '/dashboard/balancer' && <BalancerPage />}
                  {location.pathname === '/dashboard/crypto-exchange' && <CryptoExchangePage />}
                  {location.pathname === '/dashboard/whitelisting' && <WhitelistingPage />}
                  {location.pathname === '/dashboard/login-attempts' && <LoginAttemptsPage />}
                  {location.pathname === '/dashboard/all-deposits' && <AllDepositsPage />}
                  {location.pathname === '/dashboard/all-redemptions' && <AllRedemptionsPage />}
                  {location.pathname === '/dashboard/fees' && <TransactionFeesPage />}
                  {location.pathname === '/dashboard/my-activity' && <MyActivityPage />}
                  {location.pathname === '/dashboard/user-balances' && <UserBalancesPage />}
                  {location.pathname === '/dashboard/trade-history' && <MyTradeHistoryPage />}
                </div>
              </main>
            </div>
          </div>
        </SidebarProvider>
      ) : (
        // Regular user view
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

            <Tabs defaultValue="topup" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="topup">Top-up</TabsTrigger>
                <TabsTrigger value="exchange">Exchange</TabsTrigger>
                <TabsTrigger value="redeem">Redeem</TabsTrigger>
                <TabsTrigger value="deposits">Deposits</TabsTrigger>
                <TabsTrigger value="redemptions">Redemptions</TabsTrigger>
              </TabsList>
              
              <TabsContent value="topup" className="mt-6">
                <TopUpSection />
              </TabsContent>

              <TabsContent value="exchange" className="mt-6">
                <CryptoExchangeSection />
              </TabsContent>
              
              <TabsContent value="redeem" className="mt-6">
                <RedeemSection />
              </TabsContent>
              
              <TabsContent value="deposits" className="mt-6">
                <MyDepositsWrapper />
              </TabsContent>
              
              <TabsContent value="redemptions" className="mt-6">
                <MyRedemptions />
              </TabsContent>
            </Tabs>

            <div className="space-y-8">
              <MyTradeHistory />
              <UniswapSection />
              <BalancerSection />
            </div>
          </div>
        </main>
      )}
      
      <PKRFooter />
    </div>
  )
}
import { useEffect } from 'react'
import { useDisconnect, useAccount } from 'wagmi'
import { useToast } from '@/hooks/use-toast'

interface SecurityProviderProps {
  children: React.ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { disconnect } = useDisconnect()
  const { isConnected } = useAccount()
  const { toast } = useToast()

  useEffect(() => {
    // Check if page was refreshed by looking for the performance navigation type
    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    const isPageRefresh = navigationEntries.length > 0 && navigationEntries[0].type === 'reload'
    
    // If page was refreshed and user is connected, disconnect them for security
    if (isPageRefresh && isConnected) {
      disconnect()
      toast({
        title: "Security Logout",
        description: "You have been logged out for security reasons due to page refresh.",
        variant: "default",
      })
    }
  }, [disconnect, isConnected, toast])

  // Also listen for browser refresh events (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Set a flag in sessionStorage to detect refresh on next load
      if (isConnected) {
        sessionStorage.setItem('wallet-refresh-logout', 'true')
      }
    }

    // Check for the refresh flag on component mount
    const shouldLogoutOnRefresh = sessionStorage.getItem('wallet-refresh-logout')
    if (shouldLogoutOnRefresh && isConnected) {
      sessionStorage.removeItem('wallet-refresh-logout')
      disconnect()
      toast({
        title: "Security Logout",
        description: "You have been logged out for security reasons due to page refresh.",
        variant: "default",
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [disconnect, isConnected, toast])

  return <>{children}</>
}
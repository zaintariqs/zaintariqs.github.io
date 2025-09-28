import { useEffect, useRef } from 'react'
import { useDisconnect, useAccount } from 'wagmi'
import { useToast } from '@/hooks/use-toast'

interface SecurityProviderProps {
  children: React.ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { disconnect } = useDisconnect()
  const { isConnected } = useAccount()
  const { toast } = useToast()
  const hasRunSecurityCheck = useRef(false)

  // Check for refresh logout flag on mount
  useEffect(() => {
    const wasRefreshLogout = sessionStorage.getItem('wallet-refresh-logout')
    
    if (wasRefreshLogout) {
      sessionStorage.removeItem('wallet-refresh-logout')
      // Force disconnect regardless of connection state since flag was set
      disconnect()
      toast({
        title: "Security Logout",
        description: "You have been logged out for security reasons due to page refresh.",
        variant: "default",
      })
    }
  }, [disconnect, toast])

  // Monitor connection state changes after refresh logout
  useEffect(() => {
    if (!hasRunSecurityCheck.current) {
      hasRunSecurityCheck.current = true
      // Additional check for any lingering connections after refresh
      const wasRefreshLogout = sessionStorage.getItem('wallet-refresh-logout')
      if (wasRefreshLogout && isConnected) {
        sessionStorage.removeItem('wallet-refresh-logout')
        disconnect()
      }
    }
  }, [isConnected, disconnect])

  // Set refresh flag when user navigates away while connected
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnected) {
        sessionStorage.setItem('wallet-refresh-logout', 'true')
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isConnected])

  return <>{children}</>
}
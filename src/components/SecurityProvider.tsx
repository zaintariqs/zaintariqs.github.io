import { useEffect, useRef } from 'react'
import { useDisconnect, useAccount, useConnections } from 'wagmi'
import { useToast } from '@/hooks/use-toast'
import { useInactivityLogout } from '@/hooks/use-inactivity-logout'

interface SecurityProviderProps {
  children: React.ReactNode
}

export function SecurityProvider({ children }: SecurityProviderProps) {
  const { disconnect, disconnectAsync, connectors } = useDisconnect()
  const { isConnected } = useAccount()
  const { toast } = useToast()
  const connections = useConnections()
  
  // Enable automatic logout after 5 minutes of inactivity
  useInactivityLogout()
  const hasRunSecurityCheck = useRef(false)

  // Check for refresh logout flag on mount
  useEffect(() => {
    const wasRefreshLogout = sessionStorage.getItem('wallet-refresh-logout')

    if (wasRefreshLogout) {
      sessionStorage.removeItem('wallet-refresh-logout')

      // Prevent Wagmi auto-reconnect by clearing persisted keys
      try {
        const keysToClear: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (!key) continue
          if (
            key.startsWith('wagmi') ||
            key.startsWith('walletconnect') ||
            key.startsWith('@walletconnect') ||
            key.startsWith('wc@') ||
            key.includes('WalletConnect')
          ) {
            keysToClear.push(key)
          }
        }
        keysToClear.forEach((k) => localStorage.removeItem(k))
      } catch {}

      // Disconnect all active connectors to ensure a clean logout
      const doDisconnect = async () => {
        try {
          await Promise.all(
            connections.map(({ connector }) =>
              disconnectAsync({ connector }).catch(() => void 0)
            )
          )
        } finally {
          toast({
            title: "Security Logout",
            description: "You have been logged out for security reasons due to page refresh.",
            variant: "default",
          })
        }
      }
      void doDisconnect()
    }
  }, [disconnectAsync, connections, toast])

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
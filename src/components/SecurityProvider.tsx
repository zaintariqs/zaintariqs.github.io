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

  // Run security check only once on initial mount
  useEffect(() => {
    if (hasRunSecurityCheck.current) return
    hasRunSecurityCheck.current = true

    // Small delay to ensure any existing connections are established
    const checkTimeout = setTimeout(() => {
      // Check if there was a refresh flag set from previous session
      const wasRefreshLogout = sessionStorage.getItem('wallet-refresh-logout')
      
      if (wasRefreshLogout) {
        sessionStorage.removeItem('wallet-refresh-logout')
        // Only disconnect if user is actually connected
        if (isConnected) {
          disconnect()
          toast({
            title: "Security Logout",
            description: "You have been logged out for security reasons due to page refresh.",
            variant: "default",
          })
        }
      }
    }, 100)

    return () => clearTimeout(checkTimeout)
  }, []) // Empty dependency array - run only once

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
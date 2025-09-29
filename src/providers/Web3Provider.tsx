import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/web3-config'

interface Web3ProviderProps {
  children: React.ReactNode
}

const queryClient = new QueryClient()

export function Web3Provider({ children }: Web3ProviderProps) {
  // Early purge of persisted wallet sessions if a refresh-logout was requested
  try {
    if (typeof window !== 'undefined' && sessionStorage.getItem('wallet-refresh-logout')) {
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
    }
  } catch {}

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
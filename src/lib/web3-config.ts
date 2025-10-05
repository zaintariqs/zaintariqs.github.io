import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Get a free project ID from https://cloud.walletconnect.com
const projectId = '1f8e1f4e8c4a8c4a8c4a8c4a8c4a8c4a' // Replace with your actual WalletConnect project ID

if (!projectId || projectId.startsWith('YOUR_')) {
  console.warn('WalletConnect project ID not configured. Some wallet connections may not work properly.')
}

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [optimism.id]: http(),
    [base.id]: http(),
  },
})

export const supportedChains = [mainnet, polygon, arbitrum, optimism, base]
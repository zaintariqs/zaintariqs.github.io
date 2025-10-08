import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// SECURITY FIX: Get a proper project ID from https://cloud.reown.com (formerly WalletConnect Cloud)
// This placeholder ID will NOT work in production. Register your project to get a real ID.
const projectId = '1f8e1f4e8c4a8c4a8c4a8c4a8c4a8c4a' // TODO: Replace with actual project ID from cloud.reown.com

if (!projectId || projectId.length < 32 || projectId === '1f8e1f4e8c4a8c4a8c4a8c4a8c4a8c4a') {
  console.error('⚠️ SECURITY WARNING: WalletConnect project ID is not properly configured!')
  console.error('Register at https://cloud.reown.com and add your Lovable preview domain to allowlist')
  console.error('Without this, WalletConnect-based wallets will not function properly.')
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
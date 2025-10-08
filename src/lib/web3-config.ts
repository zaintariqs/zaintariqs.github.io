import { http, createConfig } from 'wagmi'
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Reown (formerly WalletConnect) project ID from https://cloud.reown.com
const projectId = 'b661aa5bbab99f5fae78346b4cf84374'

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, optimism, base],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ 
      projectId,
      metadata: {
        name: 'PKR Stable Coin',
        description: 'Pakistan Rupee Stable Coin Platform',
        url: typeof window !== 'undefined' ? window.location.origin : 'https://lovableproject.com',
        icons: ['https://d89da578-b84d-4458-b263-3ad4384455bf.lovableproject.com/pakistan-flag-icon.png']
      },
      showQrModal: true
    }),
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
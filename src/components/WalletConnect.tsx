import { useState } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import { Wallet, ChevronDown, Copy, LogOut, Network } from 'lucide-react'
import { supportedChains } from '@/lib/web3-config'
import { useToast } from '@/hooks/use-toast'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { toast } = useToast()
  
  const { data: balance } = useBalance({
    address: address,
  })

  const currentChain = supportedChains.find(chain => chain.id === chainId)
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatBalance = (balance: any) => {
    if (!balance) return '0'
    return parseFloat(balance.formatted).toFixed(4)
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  if (isConnected && address) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-crypto-dark border-crypto-gray text-white hover:bg-crypto-gray">
            <Wallet className="h-4 w-4 mr-2" />
            {formatAddress(address)}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 bg-crypto-dark border-crypto-gray">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Wallet Address</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyAddress}
                className="h-auto p-1 text-gray-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="font-mono text-sm text-white">
              {formatAddress(address)}
            </div>
            
            <DropdownMenuSeparator className="bg-crypto-gray" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Network</span>
                <div className="flex items-center text-crypto-green text-sm">
                  <Network className="h-3 w-3 mr-1" />
                  {currentChain?.name || 'Unknown'}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Balance</span>
                <div className="text-sm text-white font-medium">
                  {formatBalance(balance)} {balance?.symbol || 'ETH'}
                </div>
              </div>
            </div>
          </div>
          
          <DropdownMenuSeparator className="bg-crypto-gray" />
          
          <DropdownMenuItem 
            onClick={() => disconnect()}
            className="text-red-400 hover:text-red-300 hover:bg-crypto-gray cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="bg-crypto-green hover:bg-crypto-green/90 text-white">
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-crypto-dark border-crypto-gray">
        {connectors.map((connector) => (
          <DropdownMenuItem
            key={connector.uid}
            onClick={() => connect({ connector })}
            className="text-white hover:bg-crypto-gray cursor-pointer"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {connector.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
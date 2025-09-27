import { useState, useEffect } from 'react'
import { useAccount, useBalance, useChainId, useReadContract } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supportedChains } from '@/lib/web3-config'
import { formatUnits } from 'viem'

export function BalanceCard() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { data: ethBalance, refetch } = useBalance({
    address: address,
  })

  const currentChain = supportedChains.find(chain => chain.id === chainId)

  // PKRSC Contract Address
  const PKRSC_CONTRACT_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'

  // ERC20 ABI for balanceOf function
  const erc20Abi = [
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const

  // Read PKRSC balance from contract
  const { data: pkrscBalance, refetch: refetchPkrsc } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
  })

  // Read PKRSC decimals
  const { data: pkrscDecimals } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
  })

  // Format PKRSC balance  
  const formattedPkrscBalance = pkrscBalance && pkrscDecimals 
    ? parseFloat(formatUnits(pkrscBalance, pkrscDecimals)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '0.00'

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetch(), refetchPkrsc()])
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">
          Wallet Balance
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network</span>
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            {currentChain?.name || 'Unknown'}
          </Badge>
        </div>

        {/* PKRSC Balance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-card-foreground">PKRSC Balance</span>
          </div>
          <div className="text-3xl font-bold text-primary">
            {formattedPkrscBalance} PKRSC
          </div>
          <div className="text-sm text-muted-foreground">
            ≈ PKR {formattedPkrscBalance}
          </div>
        </div>

        {/* Native Token Balance */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {ethBalance?.symbol || 'ETH'}
            </span>
            <span className="text-sm font-medium text-card-foreground">
              {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0.0000'}
            </span>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">Wallet Address</div>
          <div className="text-xs font-mono text-card-foreground break-all">
            {address}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
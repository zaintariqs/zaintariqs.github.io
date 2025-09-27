import { useState, useEffect } from 'react'
import { useAccount, useBalance, useChainId } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supportedChains } from '@/lib/web3-config'

export function BalanceCard() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { data: ethBalance, refetch } = useBalance({
    address: address,
  })

  const currentChain = supportedChains.find(chain => chain.id === chainId)

  // Mock PKRSC balance - in real implementation, this would come from a contract
  const [pkrscBalance, setPkrscBalance] = useState('125,000.50')

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    // Simulate API call for PKRSC balance
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
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            {pkrscBalance} PKRSC
          </div>
          <div className="text-sm text-muted-foreground">
            ≈ PKR {pkrscBalance}
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
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, TrendingUp } from 'lucide-react'

// PKRSC Contract Address
const PKRSC_CONTRACT_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'

export function BalancerSection() {
  const [poolData, setPoolData] = useState({
    tvl: '$0',
    volume24h: '$0',
    loading: true
  })

  // Fetch pool data - you'll need to replace with your actual Balancer pool ID
  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        // Placeholder for Balancer API call
        // You'll need to query Balancer subgraph once pool is created
        setPoolData({
          tvl: '$0',
          volume24h: '$0',
          loading: false
        })
      } catch (error) {
        console.error('Error fetching Balancer pool data:', error)
        setPoolData({
          tvl: '$0',
          volume24h: '$0',
          loading: false
        })
      }
    }

    fetchPoolData()
    const interval = setInterval(fetchPoolData, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Balancer Trading
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Trade PKRSC with USDT on Balancer
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pool Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-card-foreground">Pool TVL</div>
            <div className="text-xl font-bold text-primary">
              {poolData.loading ? 'Loading...' : poolData.tvl}
            </div>
            <div className="text-xs text-muted-foreground">Total Value Locked</div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-card-foreground">24h Volume</div>
            <div className="text-xl font-bold text-primary">
              {poolData.loading ? 'Loading...' : poolData.volume24h}
            </div>
            <div className="text-xs text-muted-foreground">Trading Volume</div>
          </div>
        </div>

        {/* Embedded Balancer Swap Interface */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <iframe
            src={`https://app.balancer.fi/#/base/swap/${USDT_ADDRESS}/${PKRSC_CONTRACT_ADDRESS}`}
            width="100%"
            height="660px"
            style={{ border: 'none', minHeight: '660px' }}
            title="Balancer Swap Interface"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://app.balancer.fi/#/base/swap/${USDT_ADDRESS}/${PKRSC_CONTRACT_ADDRESS}`,
                '_blank'
              )
            }
          >
            Open Swap
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                'https://app.balancer.fi/#/base/pools',
                '_blank'
              )
            }
          >
            View Pools
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Info Note */}
        <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="text-xs text-black dark:text-white">
            <strong>Note:</strong> Once you create your permissioned pool on Balancer, 
            update the pool ID in this component to fetch real-time data.
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-xs text-black dark:text-white">
            <strong>Risk Warning:</strong> Cryptocurrency trading involves substantial risk. 
            Always verify pool liquidity and slippage before large trades.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

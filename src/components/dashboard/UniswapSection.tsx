import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ExternalLink, TrendingUp } from 'lucide-react'

// PKRSC Contract Address
const PKRSC_CONTRACT_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'

export function UniswapSection() {
  const [poolData, setPoolData] = useState({
    tvl: '$0',
    volume24h: '$0',
    loading: true
  })
  

  // Fetch actual PKRSC/USDT pool data from Uniswap V3 subgraph
  useEffect(() => {
    const fetchPoolData = async () => {
      try {
        // Query Uniswap V3 subgraph for Base network
        // USDT on Base: 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2
        const query = `{
          pools(
            where: {
              token0_: { id: "${PKRSC_CONTRACT_ADDRESS.toLowerCase()}" }
              token1_: { id: "0xfde4c96c8593536e31f229ea8f37b2ada2699bb2" }
            }
            orderBy: totalValueLockedUSD
            orderDirection: desc
            first: 1
          ) {
            id
            totalValueLockedUSD
            volumeUSD
            token0 {
              id
              symbol
              decimals
            }
            token1 {
              id
              symbol 
              decimals
            }
          }
        }`

        const response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-base', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query })
        })

        if (response.ok) {
          const data = await response.json()
          if (data.data?.pools && data.data.pools.length > 0) {
            const pool = data.data.pools[0]
            setPoolData({
              tvl: `$${parseFloat(pool.totalValueLockedUSD).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
              volume24h: `$${parseFloat(pool.volumeUSD).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
              loading: false
            })
          } else {
            throw new Error('Pool not found')
          }
        } else {
          throw new Error('Subgraph query failed')
        }
      } catch (error) {
        console.error('Error fetching pool data:', error)
        
        // Try alternative: fetch from DEX Screener API for Base network
        try {
          const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${PKRSC_CONTRACT_ADDRESS}`)
          if (dexResponse.ok) {
            const dexData = await dexResponse.json()
            const basePool = dexData.pairs?.find((pair: any) => 
              pair.chainId === 'base' && 
              (pair.quoteToken?.symbol === 'USDT' || pair.quoteToken?.symbol === 'USDC')
            )
            
            if (basePool) {
              setPoolData({
                tvl: `$${parseFloat(basePool.liquidity?.usd || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                volume24h: `$${parseFloat(basePool.volume?.h24 || '0').toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
                loading: false
              })
            } else {
              throw new Error('No Base pool found')
            }
          } else {
            throw new Error('DEX Screener failed')
          }
        } catch (dexError) {
          console.error('DEX Screener fallback failed:', dexError)
          // Final fallback to realistic mock data
          setPoolData({
            tvl: '$0',
            volume24h: '$0',
            loading: false
          })
        }
      }
    }

    fetchPoolData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchPoolData, 30000)
    return () => clearInterval(interval)
  }, [])


  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Uniswap Trading
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Trade PKRSC with other cryptocurrencies on Uniswap
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

        {/* Embedded Uniswap Swap Interface */}
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <iframe
            src="https://app.uniswap.org/swap?chain=base&inputCurrency=0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2&outputCurrency=0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e&theme=dark"
            width="100%"
            height="660px"
            style={{ border: 'none', minHeight: '660px' }}
            title="Uniswap Swap Interface"
          />
        </div>

        {/* Open in New Tab Option */}
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                'https://app.uniswap.org/swap?chain=base&inputCurrency=0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2&outputCurrency=0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e',
                '_blank'
              )
            }
          >
            Open in New Tab
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
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
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Trade {
  id: string
  transaction_hash: string
  timestamp: string
  token_in: string
  token_out: string
  amount_in: number
  amount_out: number
  price_at_trade: number
  block_number: number
}

export function MyTradeHistory() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTrades = async () => {
    if (!address) return

    try {
      const { data, error } = await supabase
        .from('trade_history')
        .select('*')
        .ilike('user_wallet_address', address)
        .order('timestamp', { ascending: false })

      if (error) throw error

      setTrades(data || [])
    } catch (error) {
      console.error('Error fetching trades:', error)
      toast({
        title: 'Error',
        description: 'Failed to load trade history',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const refreshTrades = async () => {
    setRefreshing(true)
    
    try {
      // Call the edge function to detect new trades
      const { error } = await supabase.functions.invoke('detect-uniswap-trades')
      
      if (error) throw error

      toast({
        title: 'Success',
        description: 'Trade history updated'
      })

      // Refresh the local data
      await fetchTrades()
    } catch (error) {
      console.error('Error refreshing trades:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh trade history',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTrades()
  }, [address])

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  if (!address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Trade History</CardTitle>
          <CardDescription>Connect your wallet to view your trade history</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>My Trade History</CardTitle>
            <CardDescription>
              Your PKRSC trades on Uniswap V3 (Base Network)
            </CardDescription>
          </div>
          <Button
            onClick={refreshTrades}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading trades...</div>
        ) : trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No trades found. Start trading on{' '}
            <a
              href={`https://app.uniswap.org/explore/pools/base/0x1bC6fB786B7B5BA4D31A7F47a75eC3Fd3B26690E`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Uniswap
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount In</TableHead>
                  <TableHead className="text-right">Amount Out</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TableRow key={trade.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(trade.timestamp)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={trade.token_in === 'PKRSC' ? 'destructive' : 'default'}>
                        {trade.token_in === 'PKRSC' ? 'Sell' : 'Buy'} PKRSC
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(trade.amount_in)} {trade.token_in}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(trade.amount_out)} {trade.token_out}
                    </TableCell>
                    <TableCell className="text-right">
                      ${trade.price_at_trade.toFixed(6)}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://basescan.org/tx/${trade.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {trade.transaction_hash.slice(0, 6)}...{trade.transaction_hash.slice(-4)}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
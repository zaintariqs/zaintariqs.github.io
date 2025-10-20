import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ExternalLink, RefreshCw, Wallet } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface USDTDeposit {
  id: string
  transaction_hash: string
  from_address: string
  amount_usdt: number
  timestamp: string
  block_number: number
}

export function MyUSDTDeposits() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [deposits, setDeposits] = useState<USDTDeposit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDeposits = async () => {
    if (!address) return

    try {
      const { data, error } = await supabase
        .from('usdt_deposits')
        .select('*')
        .ilike('user_wallet_address', address)
        .order('timestamp', { ascending: false })

      if (error) throw error

      setDeposits(data || [])
    } catch (error) {
      console.error('Error fetching USDT deposits:', error)
      toast({
        title: 'Error',
        description: 'Failed to load USDT deposit history',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshDeposits = async () => {
    setRefreshing(true)
    
    try {
      // Call the edge function to detect new USDT deposits
      const { error } = await supabase.functions.invoke('detect-usdt-deposits')
      
      if (error) throw error

      toast({
        title: 'Success',
        description: 'USDT deposit history updated'
      })

      // Refresh the local data
      await fetchDeposits()
    } catch (error) {
      console.error('Error refreshing USDT deposits:', error)
      toast({
        title: 'Error',
        description: 'Failed to refresh USDT deposit history',
        variant: 'destructive'
      })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDeposits()
  }, [address])

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatAmount = (amount: number) => {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              USDT deposits on Base Network
            </span>
          </div>
          <Button
            onClick={refreshDeposits}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {deposits.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No USDT deposits yet</p>
            <p className="text-xs text-muted-foreground mt-2">
              USDT deposits to your whitelisted address will appear here
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(deposit.timestamp)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <Badge variant="default" className="bg-crypto-green/10 text-crypto-green border-crypto-green/20">
                        {formatAmount(deposit.amount_usdt)} USDT
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatAddress(deposit.from_address)}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`https://basescan.org/tx/${deposit.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        {formatAddress(deposit.transaction_hash)}
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
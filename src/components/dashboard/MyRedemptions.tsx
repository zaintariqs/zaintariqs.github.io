import { useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Banknote, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Redemption {
  id: string
  pkrsc_amount: number
  status: string
  transaction_hash?: string
  bank_name: string
  account_number: string
  account_title: string
  created_at: string
  updated_at: string
}

export function MyRedemptions() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { toast } = useToast()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRedemptions = async () => {
      if (!address) return

      try {
        // Generate authentication signature
        const timestamp = Date.now()
        const message = `PKRSC Fetch Redemptions\nWallet: ${address}\nTimestamp: ${timestamp}`
        const signature = await signMessageAsync({ 
          account: address,
          message 
        })

        const response = await fetch(
          'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/redemptions',
          {
            method: 'GET',
            headers: {
              'x-wallet-address': address,
              'x-wallet-signature': signature,
              'x-signature-message': btoa(message),
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch redemptions')
        }

        const { data } = await response.json()
        setRedemptions(data || [])
      } catch (error) {
        console.error('Error fetching redemptions:', error)
        toast({
          title: "Error",
          description: "Failed to load redemption history",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchRedemptions()
  }, [address, signMessageAsync, toast])

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      waiting_for_burn: 'Waiting for Burn',
      burn_confirmed: 'Burn Confirmed',
      processing_transfer: 'Processing Transfer',
      completed: 'Completed',
      rejected: 'Rejected',
      cancelled: 'Cancelled'
    }

    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      waiting_for_burn: { variant: "secondary", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
      burn_confirmed: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      processing_transfer: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      completed: { variant: "default", className: "bg-green-500/10 text-green-500 border-green-500/20" },
      rejected: { variant: "destructive", className: "" },
      cancelled: { variant: "outline", className: "" },
    }

    const config = variants[status] || variants.pending
    const label = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)

    return (
      <Badge variant={config.variant} className={config.className}>
        {label}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            My Redemptions
          </CardTitle>
        </CardHeader>
        <CardContent>
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          My Redemptions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {redemptions.length === 0 ? (
          <div className="text-center py-12">
            <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No redemption history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transaction</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell className="font-medium">
                      {new Date(redemption.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{redemption.pkrsc_amount.toLocaleString()} PKRSC</TableCell>
                    <TableCell>
                      <div className="max-w-[150px]">
                        <div className="font-medium text-sm">{redemption.bank_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {redemption.account_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                    <TableCell>
                      {redemption.status === 'completed' && redemption.transaction_hash && (
                        <a
                          href={`https://basescan.org/tx/${redemption.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-primary hover:underline"
                        >
                          <span className="text-xs font-mono">
                            {redemption.transaction_hash.slice(0, 8)}...
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {['burn_confirmed', 'processing_transfer'].includes(redemption.status) && redemption.transaction_hash && (
                        <a
                          href={`https://basescan.org/tx/${redemption.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-muted-foreground hover:text-primary"
                        >
                          <span className="text-xs font-mono">
                            {redemption.transaction_hash.slice(0, 8)}...
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
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
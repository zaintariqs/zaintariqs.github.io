import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Deposit {
  id: string
  amount_pkr: number
  payment_method: string
  phone_number: string
  status: string
  transaction_id?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export function MyDeposits() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchDeposits = async () => {
      if (!address) return

      try {
        const response = await fetch(
          'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/deposits',
          {
            method: 'GET',
            headers: {
              'x-wallet-address': address,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch deposits')
        }

        const { data } = await response.json()
        setDeposits(data || [])
      } catch (error) {
        console.error('Error fetching deposits:', error)
        toast({
          title: "Error",
          description: "Failed to load deposit history",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchDeposits()
  }, [address, toast])

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      processing: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      completed: { variant: "default", className: "bg-green-500/10 text-green-500 border-green-500/20" },
      rejected: { variant: "destructive", className: "" },
      cancelled: { variant: "outline", className: "" },
    }
    const config = variants[status] || variants.pending
    return (
      <Badge variant={config.variant} className={config.className}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            My Deposits
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
          <CreditCard className="h-5 w-5 text-primary" />
          My Deposits
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deposits.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No deposit history yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell className="font-medium">
                      {new Date(deposit.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>PKR {deposit.amount_pkr.toLocaleString()}</TableCell>
                    <TableCell className="capitalize">
                      {deposit.payment_method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
                    </TableCell>
                    <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                    <TableCell>
                      {deposit.status === 'completed' && deposit.transaction_id && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">
                            {deposit.transaction_id.slice(0, 8)}...
                          </span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      {(deposit.status === 'rejected' || deposit.status === 'cancelled') && deposit.rejection_reason && (
                        <div className="text-xs text-muted-foreground max-w-xs">
                          {deposit.rejection_reason}
                        </div>
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
import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Banknote, Check, X, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Redemption {
  id: string
  user_id: string
  pkrsc_amount: number
  status: string
  transaction_hash?: string
  bank_transaction_id?: string
  bank_name: string
  account_number: string
  account_title: string
  cancellation_reason?: string
  created_at: string
  updated_at: string
}

export function AdminRedemptions() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'complete' | 'cancel'>('complete')
  const [bankTransactionId, setBankTransactionId] = useState('')
  const [burnTransactionHash, setBurnTransactionHash] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRedemptions = async () => {
    if (!address) return

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/admin-redemptions',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch redemptions')

      const { data } = await response.json()
      setRedemptions(data || [])
    } catch (error) {
      console.error('Error fetching redemptions:', error)
      toast({
        title: "Error",
        description: "Failed to load redemptions",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRedemptions()
  }, [address])

  const openDialog = (redemption: Redemption, type: 'complete' | 'cancel') => {
    setSelectedRedemption(redemption)
    setActionType(type)
    setBankTransactionId('')
    setBurnTransactionHash(redemption.transaction_hash || '')
    setCancellationReason('')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedRedemption || !address) return

    if (actionType === 'complete') {
      if (!bankTransactionId.trim()) {
        toast({
          title: "Error",
          description: "Bank transaction ID is required",
          variant: "destructive",
        })
        return
      }
    }

    if (actionType === 'cancel') {
      if (!cancellationReason.trim()) {
        toast({
          title: "Error",
          description: "Cancellation reason is required",
          variant: "destructive",
        })
        return
      }
      if (!burnTransactionHash.trim()) {
        toast({
          title: "Error",
          description: "Burned PKRSC transaction hash is required for verification",
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/admin-redemptions',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({
            redemptionId: selectedRedemption.id,
            status: actionType === 'complete' ? 'completed' : 'rejected',
            bankTransactionId: actionType === 'complete' ? bankTransactionId : undefined,
            cancellationReason: actionType === 'cancel' ? cancellationReason : undefined,
            burnTransactionHash: actionType === 'cancel' ? burnTransactionHash : undefined,
          }),
        }
      )

      if (!response.ok) throw new Error('Failed to update redemption')

      toast({
        title: "Success",
        description: `Redemption ${actionType === 'complete' ? 'completed' : 'cancelled'} successfully`,
      })

      setDialogOpen(false)
      fetchRedemptions()
    } catch (error) {
      console.error('Error updating redemption:', error)
      toast({
        title: "Error",
        description: "Failed to update redemption",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: 'Pending',
      waiting_for_burn: 'Waiting for Burn',
      burn_confirmed: 'Burn Confirmed',
      processing_transfer: 'Processing Transfer',
      completed: 'Completed',
      rejected: 'Rejected'
    }

    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      waiting_for_burn: { variant: "secondary", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
      burn_confirmed: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      processing_transfer: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      completed: { variant: "default", className: "bg-green-500/10 text-green-500 border-green-500/20" },
      rejected: { variant: "destructive", className: "bg-red-500/10 text-red-500 border-red-500/20" },
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
            All Redemptions
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
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            All Redemptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {redemptions.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No redemptions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Burn TX</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {redemptions.map((redemption) => (
                    <TableRow key={redemption.id}>
                      <TableCell className="font-medium">
                        {new Date(redemption.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {redemption.user_id.slice(0, 6)}...{redemption.user_id.slice(-4)}
                      </TableCell>
                      <TableCell>{redemption.pkrsc_amount.toLocaleString()} PKRSC</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium text-sm">{redemption.bank_name}</div>
                          <div className="text-xs text-muted-foreground">{redemption.account_title}</div>
                          <div className="text-xs text-muted-foreground font-mono">{redemption.account_number}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                      <TableCell>
                        {redemption.transaction_hash && (
                          <a
                            href={`https://basescan.org/tx/${redemption.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <span className="text-xs font-mono">
                              {redemption.transaction_hash.slice(0, 6)}...
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                      <TableCell>
                        {redemption.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => openDialog(redemption, 'complete')}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => openDialog(redemption, 'cancel')}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                        {redemption.status === 'completed' && redemption.bank_transaction_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {redemption.bank_transaction_id}
                          </span>
                        )}
                        {redemption.status === 'rejected' && redemption.cancellation_reason && (
                          <span className="text-xs text-muted-foreground">
                            {redemption.cancellation_reason}
                          </span>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'complete' ? 'Complete Redemption' : 'Cancel Redemption'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'complete' ? (
              <div className="space-y-2">
                <Label htmlFor="bankTransactionId">Bank Transaction ID</Label>
                <Input
                  id="bankTransactionId"
                  placeholder="Enter bank transaction ID"
                  value={bankTransactionId}
                  onChange={(e) => setBankTransactionId(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="burnTransactionHash">Burned PKRSC Transaction Hash</Label>
                  <Input
                    id="burnTransactionHash"
                    placeholder="0x..."
                    value={burnTransactionHash}
                    onChange={(e) => setBurnTransactionHash(e.target.value)}
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    {burnTransactionHash ? 'Auto-filled from redemption request' : 'No burn transaction found'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellationReason">Cancellation Reason</Label>
                  <Textarea
                    id="cancellationReason"
                    placeholder="e.g., Wrong account number - please submit again with correct details"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    rows={4}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
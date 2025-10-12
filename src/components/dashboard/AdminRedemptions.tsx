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
import { RefreshCw, Banknote, Check, X, ExternalLink } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Redemption {
  id: string
  user_id: string
  pkrsc_amount: number
  status: string
  transaction_hash?: string
  burn_tx_hash?: string
  bank_transaction_id?: string
  bank_name: string
  account_number: string
  account_title: string
  bankName?: string
  accountNumber?: string
  accountTitle?: string
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
  const [actionType, setActionType] = useState<'complete' | 'cancel' | 'attach'>('complete')
  const [bankTransactionId, setBankTransactionId] = useState('')
  const [userTransferHash, setUserTransferHash] = useState('')
  const [burnTransactionHash, setBurnTransactionHash] = useState('')
  const [cancellationReason, setCancellationReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')

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

  const openDialog = (redemption: Redemption, type: 'complete' | 'cancel' | 'attach') => {
    setSelectedRedemption(redemption)
    setActionType(type)
    setBankTransactionId(redemption.bank_transaction_id || '')
    setUserTransferHash(redemption.transaction_hash || '')
    setBurnTransactionHash(redemption.burn_tx_hash || '')
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

    if (actionType === 'attach') {
      if (!userTransferHash.trim()) {
        toast({
          title: "Error",
          description: "User transfer transaction hash is required",
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
              status: actionType === 'attach' ? undefined : (actionType === 'complete' ? 'completed' : 'cancelled'),
              bankTransactionId: actionType === 'complete' ? bankTransactionId : undefined,
              userTransferHash: (actionType === 'complete' || actionType === 'attach') && userTransferHash ? userTransferHash : undefined,
              cancellationReason: actionType === 'cancel' ? cancellationReason : undefined,
              burnTransactionHash: (actionType === 'cancel' || actionType === 'attach') && burnTransactionHash ? burnTransactionHash : undefined,
              attachOnly: actionType === 'attach',
            }),
        }
      )

      if (!response.ok) {
        let msg = 'Failed to update redemption'
        try {
          const err = await response.json()
          msg = err?.error || msg
        } catch {}
        throw new Error(msg)
      }

      const responseData = await response.json()
      const actualStatus = responseData.data?.status

      toast({
        title: "Success",
        description: actionType === 'attach'
          ? "Transaction hashes attached successfully"
          : actualStatus === 'pending_burn' 
          ? "Transfer hash linked. Tokens will be burned automatically (5 min), then you can complete the bank transfer."
          : `Redemption ${actionType === 'complete' ? 'completed' : 'cancelled'} successfully`,
      })

      setDialogOpen(false)
      fetchRedemptions()
    } catch (error: any) {
      console.error('Error updating redemption:', error)
      toast({
        title: "Error",
        description: error?.message || 'Failed to update redemption',
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
        cancelled: 'Cancelled'
      }

      const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
        pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
        waiting_for_burn: { variant: "secondary", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
        burn_confirmed: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
        processing_transfer: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
        completed: { variant: "default", className: "bg-crypto-green/10 text-crypto-green border-crypto-green/20" },
        cancelled: { variant: "destructive", className: "bg-red-500/10 text-red-500 border-red-500/20" },
      }

    const config = variants[status] || variants.pending
    const label = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1)

    return (
      <Badge variant={config.variant} className={config.className}>
        {label}
      </Badge>
    )
  }

  const filteredRedemptions = redemptions.filter(redemption =>
    redemption.user_id.toLowerCase().includes(searchAddress.toLowerCase())
  );

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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-5 w-5 text-primary" />
              All Redemptions
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchRedemptions()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search by wallet address..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              className="max-w-sm"
            />
          </div>
          {redemptions.length === 0 ? (
            <div className="text-center py-12">
              <Banknote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No redemptions yet</p>
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No redemptions found matching "{searchAddress}"</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Bank Details</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Transfer TX</TableHead>
                    <TableHead>Burn Proof</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRedemptions.map((redemption, index) => (
                    <TableRow key={redemption.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {new Date(redemption.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {redemption.user_id.slice(0, 6)}...{redemption.user_id.slice(-4)}
                      </TableCell>
                      <TableCell>{redemption.pkrsc_amount.toLocaleString()} PKRSC</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium text-sm">{redemption.bankName || redemption.bank_name}</div>
                          <div className="text-xs text-muted-foreground">{redemption.accountTitle || redemption.account_title}</div>
                          <div className="text-xs text-muted-foreground font-mono">{redemption.accountNumber || redemption.account_number}</div>
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
                        {redemption.burn_tx_hash ? (
                          <a
                            href={`https://basescan.org/tx/${redemption.burn_tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-crypto-green hover:underline"
                          >
                            <span className="text-xs font-mono">
                              {redemption.burn_tx_hash.slice(0, 6)}...
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : redemption.status === 'pending_burn' ? (
                          <span className="text-xs text-muted-foreground">Pending...</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {['pending', 'burn_confirmed', 'waiting_for_burn'].includes(redemption.status) && (
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
                        {redemption.status === 'completed' && (
                          <div className="flex flex-col gap-1">
                            {!redemption.transaction_hash || !redemption.burn_tx_hash ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDialog(redemption, 'attach')}
                                className="text-xs"
                              >
                                Attach TX
                              </Button>
                            ) : null}
                            {redemption.bank_transaction_id && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {redemption.bank_transaction_id}
                              </span>
                            )}
                          </div>
                        )}
                        {redemption.status === 'cancelled' && redemption.cancellation_reason && (
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
              {actionType === 'complete' ? 'Complete Redemption' : actionType === 'attach' ? 'Attach Transaction Hashes' : 'Cancel Redemption'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'attach' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="userTransferHash">User Transfer TX Hash</Label>
                  <Input
                    id="userTransferHash"
                    placeholder="0x... (transfer to master minter)"
                    value={userTransferHash}
                    onChange={(e) => setUserTransferHash(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="burnTransactionHash">Burn Transaction Hash (Optional)</Label>
                  <Input
                    id="burnTransactionHash"
                    placeholder="0x... (added automatically by cron job after 5 mins)"
                    value={burnTransactionHash}
                    onChange={(e) => setBurnTransactionHash(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    The burn transaction is automatically executed by the cron job. You only need to add the user transfer hash now.
                  </p>
                </div>
              </>
            ) : actionType === 'complete' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="userTransferHash">User Transfer TX Hash (Optional)</Label>
                  <Input
                    id="userTransferHash"
                    placeholder="0x... (if user transferred tokens)"
                    value={userTransferHash}
                    onChange={(e) => setUserTransferHash(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If user transferred tokens to master minter but didn't link the TX, paste it here for burn process
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankTransactionId">Bank Transaction ID</Label>
                  <Input
                    id="bankTransactionId"
                    placeholder="Enter bank transaction ID"
                    value={bankTransactionId}
                    onChange={(e) => setBankTransactionId(e.target.value)}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="burnTransactionHash">Burned PKRSC Transaction Hash</Label>
                  <Input
                    id="burnTransactionHash"
                    placeholder="0x... (enter manually if not auto-filled)"
                    value={burnTransactionHash}
                    onChange={(e) => setBurnTransactionHash(e.target.value)}
                    className={!burnTransactionHash ? 'border-yellow-500' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    {burnTransactionHash ? 'Auto-filled from redemption request' : 'Transaction hash not found - please enter manually'}
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
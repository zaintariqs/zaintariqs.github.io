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
import { CreditCard, Check, X, ExternalLink, Eye } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Deposit {
  id: string
  user_id: string
  amount_pkr: number
  payment_method: string
  phone_number: string
  status: string
  transaction_id?: string
  user_transaction_id?: string
  receipt_url?: string
  submitted_at?: string
  mint_transaction_hash?: string
  rejection_reason?: string
  created_at: string
  updated_at: string
}

export function AdminDeposits() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [mintTxHash, setMintTxHash] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchDeposits = async () => {
    if (!address) return

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/admin-deposits',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
          },
        }
      )

      if (!response.ok) throw new Error('Failed to fetch deposits')

      const { data } = await response.json()
      setDeposits(data || [])
    } catch (error) {
      console.error('Error fetching deposits:', error)
      toast({
        title: "Error",
        description: "Failed to load deposits",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDeposits()
  }, [address])

  const openDialog = (deposit: Deposit, type: 'approve' | 'reject' | 'view') => {
    setSelectedDeposit(deposit)
    setActionType(type as 'approve' | 'reject')
    setMintTxHash('')
    setRejectionReason('')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!selectedDeposit || !address) return

    if (actionType === 'approve' && !mintTxHash.trim()) {
      toast({
        title: "Error",
        description: "Mint transaction hash is required",
        variant: "destructive",
      })
      return
    }

    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Rejection reason is required",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/approve-deposit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
          },
          body: JSON.stringify({
            depositId: selectedDeposit.id,
            action: actionType,
            mintTxHash: actionType === 'approve' ? mintTxHash : undefined,
            rejectionReason: actionType === 'reject' ? rejectionReason : undefined,
          }),
        }
      )

      if (!response.ok) throw new Error(`Failed to ${actionType} deposit`)

      toast({
        title: "Success",
        description: `Deposit ${actionType === 'approve' ? 'approved' : 'rejected'} successfully`,
      })

      setDialogOpen(false)
      fetchDeposits()
    } catch (error) {
      console.error('Error updating deposit:', error)
      toast({
        title: "Error",
        description: "Failed to update deposit",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
            All Deposits
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
            <CreditCard className="h-5 w-5 text-primary" />
            All Deposits
          </CardTitle>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No deposits yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="font-medium">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {deposit.user_id.slice(0, 6)}...{deposit.user_id.slice(-4)}
                      </TableCell>
                      <TableCell>PKR {deposit.amount_pkr.toLocaleString()}</TableCell>
                      <TableCell className="capitalize">
                        {deposit.payment_method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
                      </TableCell>
                      <TableCell>{deposit.phone_number}</TableCell>
                      <TableCell>{getStatusBadge(deposit.status)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          {deposit.receipt_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDialog(deposit, 'view')}
                              className="w-full"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Proof
                            </Button>
                          )}
                          {(deposit.status === 'pending' || deposit.status === 'processing') && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => openDialog(deposit, 'approve')}
                                className="flex-1"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openDialog(deposit, 'reject')}
                                className="flex-1"
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          )}
                          {deposit.status === 'completed' && deposit.transaction_id && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {deposit.transaction_id}
                            </span>
                          )}
                          {deposit.status === 'rejected' && deposit.rejection_reason && (
                            <span className="text-xs text-muted-foreground">
                              {deposit.rejection_reason}
                            </span>
                          )}
                        </div>
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
              {actionType === 'approve' 
                ? 'Approve Deposit & Mint Tokens' 
                : actionType === 'reject' 
                ? 'Reject Deposit'
                : 'View Payment Proof'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedDeposit && (
              <>
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <p className="text-sm">User: {selectedDeposit.user_id}</p>
                  <p className="text-sm">Amount: PKR {selectedDeposit.amount_pkr}</p>
                  <p className="text-sm">Payment Method: {selectedDeposit.payment_method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}</p>
                  <p className="text-sm">Phone: {selectedDeposit.phone_number}</p>
                  {selectedDeposit.user_transaction_id && (
                    <p className="text-sm font-medium">User TX ID: {selectedDeposit.user_transaction_id}</p>
                  )}
                </div>
                {selectedDeposit.receipt_url && (
                  <div className="space-y-2">
                    <Label>Payment Proof</Label>
                    <div className="border rounded-lg overflow-hidden">
                      <img 
                        src={selectedDeposit.receipt_url} 
                        alt="Payment Receipt" 
                        className="w-full h-auto max-h-96 object-contain bg-muted"
                      />
                    </div>
                    <a
                      href={selectedDeposit.receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Open in new tab
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </>
            )}
            {actionType === 'approve' ? (
              <div className="space-y-2">
                <Label htmlFor="mintTxHash">Mint Transaction Hash</Label>
                <Input
                  id="mintTxHash"
                  placeholder="Enter PKRSC mint transaction hash (0x...)"
                  value={mintTxHash}
                  onChange={(e) => setMintTxHash(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Mint {selectedDeposit?.amount_pkr} PKRSC to {selectedDeposit?.user_id}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="rejectionReason">Rejection Reason</Label>
                <Textarea
                  id="rejectionReason"
                  placeholder="Enter reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              {actionType === 'approve' || actionType === 'reject' ? 'Cancel' : 'Close'}
            </Button>
            {(actionType === 'approve' || actionType === 'reject') && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
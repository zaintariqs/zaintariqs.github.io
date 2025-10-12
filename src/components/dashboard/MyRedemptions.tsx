import { useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Banknote, ExternalLink, RefreshCcw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Redemption {
  id: string
  pkrsc_amount: number
  status: string
  transaction_hash?: string
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

export function MyRedemptions() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { toast } = useToast()
  const [redemptions, setRedemptions] = useState<Redemption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedRedemption, setSelectedRedemption] = useState<Redemption | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountTitle: ''
  })

  const pakistaniBanks = [
    'HBL Bank',
    'UBL Bank',
    'Meezan Bank',
    'Bank Alfalah',
    'MCB Bank',
    'Faysal Bank',
    'Standard Chartered',
    'Habib Metro Bank',
    'Soneri Bank',
    'Bank Al Habib',
    'JS Bank',
    'Askari Bank',
    'BOP Bank',
    'NBP Bank',
    'Allied Bank'
  ]

  useEffect(() => {
    fetchRedemptions()
  }, [address, toast])

  const fetchRedemptions = async () => {
    if (!address) return

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/redemptions',
        {
          method: 'GET',
          headers: {
            'x-wallet-address': address,
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

  // Check if this is the most recent cancelled redemption for this burn tx hash
  const canResubmit = (redemption: Redemption): boolean => {
    if (redemption.status !== 'cancelled' || !redemption.transaction_hash) {
      return false
    }

    // Find all redemptions with the same burn transaction hash
    const sameHashRedemptions = redemptions.filter(
      r => r.transaction_hash === redemption.transaction_hash
    )

    // Don't allow resubmit if any redemption with this hash is already completed
    const hasCompletedRedemption = sameHashRedemptions.some(r => r.status === 'completed')
    if (hasCompletedRedemption) {
      return false
    }

    // Sort by created_at descending (most recent first)
    const sortedByDate = sameHashRedemptions.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    // Find the most recent cancelled one
    const mostRecentCancelled = sortedByDate.find(r => r.status === 'cancelled')

    // Only allow resubmit if this is the most recent cancelled redemption
    return mostRecentCancelled?.id === redemption.id
  }

  const handleResubmit = (redemption: Redemption) => {
    setSelectedRedemption(redemption)
    setFormData({
      bankName: '',
      accountNumber: '',
      accountTitle: ''
    })
    setDialogOpen(true)
  }

  const handleSubmitResubmission = async () => {
    if (!formData.bankName || !formData.accountNumber || !formData.accountTitle || !selectedRedemption || !address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bank details",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const timestamp = Date.now()
      const message = `PKRSC Redemption Authentication\nWallet: ${address}\nTimestamp: ${timestamp}`
      
      const signature = await signMessageAsync({ 
        account: address,
        message 
      })

      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/redemptions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
            'x-wallet-signature': signature,
            'x-signature-message': btoa(message),
          },
          body: JSON.stringify({
            walletAddress: address,
            existingTransferTx: selectedRedemption.transaction_hash,
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            accountTitle: formData.accountTitle,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create redemption')
      }

      toast({
        title: "Success",
        description: "Redemption request submitted with corrected bank details",
      })

      setDialogOpen(false)
      fetchRedemptions()
    } catch (error) {
      console.error('Error resubmitting redemption:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit redemption",
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
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead className="w-[120px]">Amount</TableHead>
                  <TableHead className="w-[150px]">Bank</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]">Burn TX</TableHead>
                  <TableHead className="min-w-[200px]">Actions</TableHead>
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
                        <div className="font-medium text-sm">{redemption.bankName || redemption.bank_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {redemption.accountNumber || redemption.account_number}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(redemption.status)}</TableCell>
                    <TableCell>
                      {redemption.transaction_hash && (
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
                    </TableCell>
                    <TableCell className="min-w-[200px]">
                      {redemption.status === 'completed' && redemption.bank_transaction_id && (
                        <span className="text-sm font-mono text-green-600 dark:text-green-400 break-all">
                          {redemption.bank_transaction_id}
                        </span>
                      )}
                      {redemption.status === 'cancelled' && (
                        <div className="space-y-2 py-1">
                          {redemption.cancellation_reason && (
                            <p className="text-xs text-muted-foreground break-words">
                              {redemption.cancellation_reason}
                            </p>
                          )}
                          {canResubmit(redemption) ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleResubmit(redemption)}
                              className="w-full whitespace-nowrap"
                            >
                              <RefreshCcw className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="text-xs">Resubmit</span>
                            </Button>
                          ) : redemption.transaction_hash && (
                            <p className="text-xs text-muted-foreground italic break-words">
                              {redemptions.some(r => r.transaction_hash === redemption.transaction_hash && r.status === 'completed')
                                ? 'Completed (see completed entry)'
                                : 'Resubmitted (see newer entry)'}
                            </p>
                          )}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resubmit Redemption with Correct Bank Details</DialogTitle>
          </DialogHeader>
          {selectedRedemption && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Amount: {selectedRedemption.pkrsc_amount} PKRSC</p>
                <p className="text-xs text-muted-foreground">
                  Burn TX: {selectedRedemption.transaction_hash?.slice(0, 10)}...
                </p>
                <p className="text-xs text-muted-foreground">
                  Your tokens are already burned. Just provide correct bank details.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resubmit-bankName">Bank Name</Label>
                <Select 
                  value={formData.bankName} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, bankName: value }))}
                >
                  <SelectTrigger id="resubmit-bankName">
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {pakistaniBanks.map((bank) => (
                      <SelectItem key={bank} value={bank}>
                        {bank}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="resubmit-accountNumber">Account Number</Label>
                <Input
                  id="resubmit-accountNumber"
                  placeholder="Enter account number"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resubmit-accountTitle">Account Title</Label>
                <Input
                  id="resubmit-accountTitle"
                  placeholder="Enter account holder name"
                  value={formData.accountTitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountTitle: e.target.value }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmitResubmission} disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Redemption'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
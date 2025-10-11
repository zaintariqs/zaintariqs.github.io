import { useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { CreditCard, ExternalLink, Upload } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Deposit {
  id: string
  amount_pkr: number
  payment_method: string
  phone_number: string
  status: string
  transaction_id?: string
  user_transaction_id?: string
  receipt_url?: string
  submitted_at?: string
  rejection_reason?: string
  mint_transaction_hash?: string
  created_at: string
  updated_at: string
}

export function MyDeposits() {
  const { address } = useAccount()
  const { toast } = useToast()
  const { signMessageAsync } = useSignMessage()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [verificationDialogOpen, setVerificationDialogOpen] = useState(false)
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [transactionId, setTransactionId] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [verificationCode, setVerificationCode] = useState('')

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

  useEffect(() => {
    fetchDeposits()
  }, [address, toast])

  const handleSubmitProof = (deposit: Deposit) => {
    setSelectedDeposit(deposit)
    setTransactionId('')
    setReceiptFile(null)
    setDialogOpen(true)
  }

  const handleUploadProof = async () => {
    if (!selectedDeposit || !transactionId || !receiptFile || !address) {
      toast({
        title: "Missing Information",
        description: "Please provide both transaction ID and receipt",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Upload receipt to storage
      const fileExt = receiptFile.name.split('.').pop()
      const fileName = `${address}/${selectedDeposit.id}-${Date.now()}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('deposit-receipts')
        .upload(fileName, receiptFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('deposit-receipts')
        .getPublicUrl(fileName)

      // Sign message to prove wallet ownership
      const message = `Submit proof for deposit ${selectedDeposit.id} with transaction ${transactionId} at ${new Date().toISOString()}`
      const signature = await signMessageAsync({ 
        message,
        account: address
      })

      // Submit proof via edge function
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/deposits',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
            'x-wallet-signature': signature,
            'x-signature-message': btoa(message),
          },
          body: JSON.stringify({
            depositId: selectedDeposit.id,
            transactionId,
            receiptUrl: publicUrl,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to submit proof')
      }

      toast({
        title: "Success",
        description: "Transaction proof submitted for review",
      })

      setDialogOpen(false)
      fetchDeposits()
    } catch (error) {
      console.error('Error submitting proof:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit proof",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerifyEmail = (deposit: Deposit) => {
    setSelectedDeposit(deposit)
    setVerificationCode('')
    setVerificationDialogOpen(true)
  }

  const handleVerifyCode = async () => {
    if (!selectedDeposit || !verificationCode) {
      toast({
        title: "Missing Code",
        description: "Please enter the verification code",
        variant: "destructive"
      })
      return
    }

    setIsVerifying(true)
    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/verify-deposit',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            depositId: selectedDeposit.id,
            verificationCode: verificationCode,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed')
      }

      toast({
        title: "Success",
        description: "Email verified! Now submit your payment proof.",
      })
      
      setVerificationDialogOpen(false)
      fetchDeposits()
    } catch (error) {
      console.error('Error verifying code:', error)
      toast({
        title: "Verification Failed",
        description: error instanceof Error ? error.message : "Invalid or expired code",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", className: string }> = {
      draft: { variant: "secondary", className: "bg-gray-500/10 text-gray-500 border-gray-500/20" },
      pending: { variant: "secondary", className: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      processing: { variant: "secondary", className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      completed: { variant: "default", className: "bg-crypto-green/10 text-crypto-green border-crypto-green/20" },
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
                  <TableHead>Action</TableHead>
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
                      {deposit.status === 'completed' && deposit.mint_transaction_hash && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Mint TX:</p>
                          <a
                            href={`https://basescan.org/tx/${deposit.mint_transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-primary hover:underline flex items-center gap-1"
                          >
                            {deposit.mint_transaction_hash.slice(0, 10)}...{deposit.mint_transaction_hash.slice(-8)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      {(deposit.status === 'rejected' || deposit.status === 'cancelled') && deposit.rejection_reason && (
                        <div className="text-xs text-muted-foreground max-w-xs">
                          {deposit.rejection_reason}
                        </div>
                      )}
                      {deposit.submitted_at && (
                        <div className="text-xs text-muted-foreground">
                          Proof submitted
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {deposit.status === 'draft' && (
                          <Button
                            size="sm"
                            onClick={() => handleVerifyEmail(deposit)}
                            className="w-full"
                          >
                            Verify Email
                          </Button>
                        )}
                        {deposit.status === 'pending' && !deposit.submitted_at && (
                          <Button
                            size="sm"
                            onClick={() => handleSubmitProof(deposit)}
                            className="w-full"
                          >
                            <Upload className="h-3 w-3 mr-2" />
                            Submit Proof
                          </Button>
                        )}
                        {deposit.receipt_url && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(deposit.receipt_url, '_blank')}
                            className="w-full"
                          >
                            <ExternalLink className="h-3 w-3 mr-2" />
                            View Proof
                          </Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Amount: PKR {selectedDeposit.amount_pkr}</p>
                <p className="text-xs text-muted-foreground">
                  Payment Method: {selectedDeposit.payment_method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transaction-id">Transaction ID</Label>
                <Input
                  id="transaction-id"
                  placeholder="Enter your transaction ID"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="receipt">Payment Receipt</Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Upload a screenshot or photo of your payment receipt
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleUploadProof} disabled={isSubmitting}>
              {isSubmitting ? 'Uploading...' : 'Submit Proof'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={verificationDialogOpen} onOpenChange={setVerificationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Your Email</DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <p className="text-sm font-medium">Amount: PKR {selectedDeposit.amount_pkr}</p>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit verification code sent to your email
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification Code</Label>
                <Input
                  id="verify-code"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground">
                  Code expires in 15 minutes. You have 5 attempts.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setVerificationDialogOpen(false)} 
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button onClick={handleVerifyCode} disabled={isVerifying || !verificationCode}>
              {isVerifying ? 'Verifying...' : 'Verify'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
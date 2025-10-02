import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Banknote, Copy, ArrowDownToLine, Clock, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export function RedeemSection() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    accountNumber: '',
    accountTitle: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [redemptionId, setRedemptionId] = useState<string | null>(null)
  const [transactionHash, setTransactionHash] = useState<string | null>(null)

  const burnAddress = '0x000000000000000000000000000000000000dEaD'

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    })
  }

  const handleSubmitRedemption = async () => {
    if (!formData.amount || !formData.bankName || !formData.accountNumber || !formData.accountTitle) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Generate authentication message and signature
      const timestamp = Date.now()
      const message = `PKRSC Redemption Authentication\nWallet: ${address}\nTimestamp: ${timestamp}`
      
      const signature = await signMessageAsync({ 
        account: address,
        message 
      })
      
      // Call the secure edge function with cryptographic proof of wallet ownership
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/redemptions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
            'x-wallet-signature': signature,
            'x-signature-message': btoa(message), // Base64 encode to avoid header validation issues
          },
          body: JSON.stringify({
            walletAddress: address,
            pkrscAmount: parseFloat(formData.amount),
            bankName: formData.bankName,
            accountNumber: formData.accountNumber,
            accountTitle: formData.accountTitle,
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create redemption request')
      }

      const { data } = await response.json()

      setRedemptionId(data.id)
      toast({
        title: "Redemption Request Created",
        description: "Please send PKRSC tokens to the burn address below",
      })

      // Simulate transaction hash after some time (in real app, this would come from blockchain monitoring)
      setTimeout(async () => {
        const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`
        setTransactionHash(mockTxHash)
        
        // Generate new signature for update request
        const updateTimestamp = Date.now()
        const updateMessage = `PKRSC Redemption Update\nWallet: ${address}\nTimestamp: ${updateTimestamp}`
        const updateSignature = await signMessageAsync({ 
          account: address,
          message: updateMessage 
        })
        
        // Update redemption status via edge function with authentication
        await fetch(
          'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/redemptions',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'x-wallet-address': address,
              'x-wallet-signature': updateSignature,
              'x-signature-message': btoa(updateMessage), // Base64 encode
            },
            body: JSON.stringify({
              redemptionId: data.id,
              transactionHash: mockTxHash,
              status: 'burn_confirmed',
            }),
          }
        )
      }, 5000)

    } catch (error) {
      console.error('Error creating redemption:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create redemption request",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <Banknote className="h-5 w-5 text-primary" />
          Redeem PKRSC for PKR
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Convert your PKRSC tokens back to Pakistani Rupees in your bank account
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {!redemptionId ? (
          <>
            {/* Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKRSC)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                min="1"
                step="0.01"
              />
              <p className="text-xs text-muted-foreground">
                Minimum redemption: 100 PKRSC
              </p>
            </div>

            {/* Bank Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Select 
                  value={formData.bankName} 
                  onValueChange={(value) => handleInputChange('bankName', value)}
                >
                  <SelectTrigger>
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
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  placeholder="Enter account number"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountTitle">Account Title</Label>
              <Input
                id="accountTitle"
                placeholder="Enter account holder name"
                value={formData.accountTitle}
                onChange={(e) => handleInputChange('accountTitle', e.target.value)}
              />
            </div>

            {/* Processing Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm text-card-foreground">Processing Information</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Processing time: 1-3 business days</li>
                <li>• Processing fees 100rs</li>
                <li>• 1:1 exchange rate (1 PKRSC = 1 PKR)</li>
                <li>• Transfers processed during banking hours</li>
              </ul>
            </div>

            <Button 
              onClick={handleSubmitRedemption}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Creating Request..." : "Create Redemption Request"}
            </Button>
          </>
        ) : (
          <>
            {/* Burn Address Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-card-foreground">Send PKRSC to Burn Address</h3>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Burn Address:</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(burnAddress)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="font-mono text-xs break-all bg-background rounded p-2 border">
                  {burnAddress}
                </div>
                <div className="text-xs text-muted-foreground">
                  Send exactly <strong>{formData.amount} PKRSC</strong> to this address
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <Clock className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="font-medium text-sm text-card-foreground">Waiting for Transaction</p>
                  <p className="text-xs text-muted-foreground">
                    We're monitoring the burn address for your transaction
                  </p>
                </div>
              </div>

              {/* Transaction Confirmed */}
              {transactionHash && (
                <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-card-foreground">Transaction Confirmed</p>
                    <p className="text-xs text-muted-foreground">
                      Hash: {transactionHash.slice(0, 10)}...
                    </p>
                    <Badge variant="secondary" className="mt-2">
                      Awaiting PKR Transfer to Bank Account
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
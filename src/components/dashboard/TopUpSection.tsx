import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { CreditCard, Smartphone, ArrowRight, Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAccount, useSignMessage } from 'wagmi'

export function TopUpSection() {
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [verificationDialog, setVerificationDialog] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [currentDepositId, setCurrentDepositId] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const { toast } = useToast()
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const handleTopUp = async (method: 'easypaisa' | 'jazzcash') => {
    if (!amount || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter amount and phone number",
        variant: "destructive"
      })
      return
    }
    
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to create a deposit",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    
    try {
      // Sign message to prove wallet ownership
      const message = `Create deposit request for ${parseFloat(amount)} PKR via ${method} at ${new Date().toISOString()}`
      const signature = await signMessageAsync({ 
        message,
        account: address
      })
      
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/deposits',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': address,
            'x-wallet-signature': signature,
            'x-signature-message': btoa(message),
          },
          body: JSON.stringify({
            amount: parseFloat(amount),
            paymentMethod: method,
            phoneNumber: phoneNumber,
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to create deposit request')
      }

      const result = await response.json()
      setCurrentDepositId(result.data.id)
      
      toast({
        title: "Check Your Email",
        description: "We've sent a verification code to your email address.",
      })
      
      setVerificationDialog(true)
      setAmount('')
      setPhoneNumber('')
    } catch (error) {
      console.error('Error creating deposit:', error)
      toast({
        title: "Error",
        description: "Failed to create deposit request",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || !currentDepositId) {
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
            depositId: currentDepositId,
            code: verificationCode,
          }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Verification failed')
      }

      toast({
        title: "Success",
        description: "Deposit verified! Now submit your payment proof in the My Deposits section.",
      })
      
      setVerificationDialog(false)
      setVerificationCode('')
      setCurrentDepositId(null)
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

  return (
    <>
      <Dialog open={verificationDialog} onOpenChange={setVerificationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Verify Your Email
            </DialogTitle>
            <DialogDescription>
              Enter the 6-digit verification code sent to your email address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
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
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setVerificationDialog(false)} 
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
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          Top-up PKRSC
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add funds to your PKRSC balance using Pakistani payment methods
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
            />
            <div className="text-sm text-muted-foreground">
              Minimum: PKR 100 • Maximum: PKR 50,000
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+92 300 1234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          {/* Payment Methods */}
          <Tabs defaultValue="easypaisa" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="easypaisa" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                EasyPaisa
              </TabsTrigger>
              <TabsTrigger value="jazzcash" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                JazzCash
              </TabsTrigger>
              <TabsTrigger value="bank" className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Deposit
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="easypaisa" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium text-card-foreground">EasyPaisa Payment</div>
                  <div className="text-sm text-muted-foreground">Instant PKRSC delivery</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  1.5% Fee
                </Badge>
              </div>
              <Button 
                onClick={() => handleTopUp('easypaisa')}
                disabled={isProcessing || !amount || !phoneNumber}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isProcessing ? 'Processing...' : 'Pay with EasyPaisa'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>

            <TabsContent value="jazzcash" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium text-card-foreground">JazzCash Payment</div>
                  <div className="text-sm text-muted-foreground">Instant PKRSC delivery</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  1.5% Fee
                </Badge>
              </div>
              <Button 
                onClick={() => handleTopUp('jazzcash')}
                disabled={isProcessing || !amount || !phoneNumber}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isProcessing ? 'Processing...' : 'Pay with JazzCash'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>

            <TabsContent value="bank" className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                <div className="font-medium text-card-foreground mb-3">Bank Transfer Details</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank Name:</span>
                    <span className="font-medium text-card-foreground">Meezan Bank</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-medium text-card-foreground">10111000111001</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IBAN:</span>
                    <span className="font-medium text-card-foreground">PKMEZN100100101000111110</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Title:</span>
                    <span className="font-medium text-card-foreground">PKR Stable Coin</span>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  ⚠️ Disclaimer: Upload the proof of payment to complete the transaction
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Exchange Rate */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <div className="text-sm font-medium text-card-foreground mb-2">Exchange Rate</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>1 PKR = 1 PKRSC (1:1 peg)</div>
              <div>Processing time: Instant</div>
              <div>Daily limit: PKR 100,000</div>
            </div>
          </div>
        </div>
      </CardContent>
      </Card>
    </>
  )
}
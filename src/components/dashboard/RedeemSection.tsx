import { useState, useEffect } from 'react'
import { useAccount, useSignMessage, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { base } from 'wagmi/chains'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Banknote, Copy, ArrowDownToLine, Clock, CheckCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: 'amount', type: 'uint256' }
    ],
    name: 'burn',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  },
  {
    constant: false,
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' }
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    type: 'function'
  }
] as const

export function RedeemSection() {
  const { address } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const { writeContractAsync } = useWriteContract()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    amount: '', // PKR amount to receive (whole number)
    bankName: '',
    accountNumber: '',
    accountTitle: ''
  })
  
  // Calculate PKRSC needed based on desired PKR
  const calculatePKRSCNeeded = (desiredPKR: number) => {
    const FEE_PERCENTAGE = 0.5
    return desiredPKR / (1 - FEE_PERCENTAGE / 100)
  }
  
  const pkrAmount = parseFloat(formData.amount) || 0
  const pkrscNeeded = calculatePKRSCNeeded(pkrAmount)
  const feeAmount = pkrscNeeded - pkrAmount
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [pendingTxHash, setPendingTxHash] = useState<string | null>(null)
  const [redemptionId, setRedemptionId] = useState<string | null>(null)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  const PKRSC_TOKEN_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
  const MASTER_MINTER_ADDRESS = '0x50C46b0286028c3ab12b947003129FEb39CcF082'

  // Monitor transaction confirmation
  const { isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: pendingTxHash as `0x${string}` | undefined,
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  // Update backend when transaction is confirmed
  useEffect(() => {
    if (isTxConfirmed && pendingTxHash && redemptionId && address) {
      const updateRedemption = async () => {
        try {
          console.log('Transaction confirmed, updating redemption:', redemptionId, 'with hash:', pendingTxHash)
          
          const updateTimestamp = Date.now()
          const updateMessage = `PKRSC Redemption Update\nWallet: ${address}\nTimestamp: ${updateTimestamp}`
          const updateSignature = await signMessageAsync({ 
            account: address,
            message: updateMessage 
          })
          
          const response = await fetch(
            'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/redemptions',
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-wallet-address': address,
                'x-wallet-signature': updateSignature,
                'x-signature-message': btoa(updateMessage),
              },
              body: JSON.stringify({
                redemptionId,
                transactionHash: pendingTxHash,
                status: 'transfer_confirmed',
              }),
            }
          )

          if (response.ok) {
            console.log('Redemption updated successfully')
            toast({
              title: "Transfer Transaction Confirmed!",
              description: "Your tokens have been transferred. Automated burning will occur shortly.",
            })
          } else {
            const errorData = await response.json()
            console.error('Failed to update redemption:', errorData)
          }
        } catch (error) {
          console.error('Error updating redemption:', error)
          toast({
            title: "Update Error",
            description: "Failed to update redemption status. Please contact support.",
            variant: "destructive"
          })
        }
      }
      updateRedemption()
    }
  }, [isTxConfirmed, pendingTxHash, redemptionId, address, signMessageAsync, toast])

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
            'x-signature-message': btoa(message),
          },
          body: JSON.stringify({
            walletAddress: address,
            desiredPKR: parseInt(formData.amount), // Whole number PKR
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
      setShowVerification(true)

      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification code.",
      })

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

  const handleVerifyAndTransfer = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter a 6-digit verification code",
        variant: "destructive",
      })
      return
    }

    if (!address || !redemptionId) return

    setIsVerifying(true)

    try {
      // Verify the code
      const verifyResponse = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/verify-redemption',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            redemptionId,
            verificationCode,
          }),
        }
      )

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        throw new Error(errorData.error || 'Verification failed')
      }

      setIsVerified(true)

      toast({
        title: "Email Verified",
        description: "Transferring tokens to master minter...",
      })

      // Transfer full amount to master minter (they will handle fee & burn)
      const pkrscAmount = calculatePKRSCNeeded(parseInt(formData.amount))
      
      console.log(`Transferring ${pkrscAmount.toFixed(6)} PKRSC to master minter for ${formData.amount} PKR redemption`)

      const txHash = await writeContractAsync({
        address: PKRSC_TOKEN_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [MASTER_MINTER_ADDRESS as `0x${string}`, parseUnits(pkrscAmount.toFixed(6), 6)],
        account: address,
        chain: base,
      })

      setPendingTxHash(txHash)
      console.log('Transfer transaction:', txHash)
      
      toast({
        title: "Transaction Submitted",
        description: "Waiting for blockchain confirmation...",
      })

    } catch (error) {
      console.error('Error verifying or transferring:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Verification or transfer failed",
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    // Resubmit to get a new code
    await handleSubmitRedemption()
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
        {!showVerification && !redemptionId ? (
          <>
            {/* PKR Amount Input */}
            <div className="space-y-2">
              <Label htmlFor="amount">PKR Amount to Receive</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={formData.amount}
                onChange={(e) => {
                  const value = e.target.value
                  // Only allow whole numbers
                  if (value === '' || /^\d+$/.test(value)) {
                    handleInputChange('amount', value)
                  }
                }}
                min="100"
                step="1"
              />
              <p className="text-xs text-muted-foreground">
                Minimum: 100 PKR • Bank transfers must be whole numbers
              </p>
              
              {pkrAmount >= 100 && (
                <div className="mt-2 p-3 bg-muted/50 rounded-lg border border-border">
                  <p className="text-xs font-medium text-card-foreground mb-1">Transaction Breakdown:</p>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>You will receive:</span>
                      <span className="font-semibold text-primary">{pkrAmount} PKR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PKRSC to burn:</span>
                      <span>{pkrscNeeded.toFixed(6)} PKRSC</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing fee (0.5%):</span>
                      <span>{feeAmount.toFixed(6)} PKRSC</span>
                    </div>
                  </div>
                </div>
              )}
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
                <li>• 0.5% processing fee (deducted from PKRSC)</li>
                <li>• 1:1 exchange rate (1 PKRSC = 1 PKR)</li>
                <li>• Bank receives exact whole PKR amount</li>
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
        ) : showVerification && !isVerified ? (
          <>
            {/* Email Verification Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-card-foreground">Verify Your Email</h3>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">
                  We've sent a 6-digit verification code to your email. Please enter it below to proceed with the token burn.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    type="text"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
              </div>

              <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <strong>Important:</strong> After verification:
                  <br />• You will transfer {pkrscNeeded.toFixed(6)} PKRSC to master minter wallet
                  <br />• 0.5% fee ({feeAmount.toFixed(6)} PKRSC) will be kept as processing fee
                  <br />• Remaining amount will be automatically burned
                  <br />• You will receive exactly {pkrAmount} PKR in your bank account (whole number)
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleVerifyAndTransfer}
                  disabled={isVerifying || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {isVerifying ? "Processing..." : "Verify & Transfer Tokens"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleResendCode}
                  disabled={isVerifying}
                >
                  Resend Code
                </Button>
              </div>
            </div>
          </>
        ) : isVerified && redemptionId ? (
          <>
            {/* Transaction Status */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="h-5 w-5 text-primary" />
                <h3 className="font-medium text-card-foreground">Transfer Transaction</h3>
              </div>

              {!isTxConfirmed ? (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="font-medium text-sm text-card-foreground">Transaction Processing</p>
                    <p className="text-xs text-muted-foreground">
                      Waiting for blockchain confirmation...
                    </p>
                    {pendingTxHash && (
                      <a
                        href={`https://basescan.org/tx/${pendingTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 block"
                      >
                        View on BaseScan
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-crypto-green/10 rounded-lg border border-crypto-green/20">
                  <CheckCircle className="h-5 w-5 text-crypto-green" />
                  <div className="flex-1">
                    <p className="font-medium text-sm text-card-foreground">Transfer Confirmed!</p>
                    <p className="text-xs text-muted-foreground">
                      {pkrscNeeded.toFixed(6)} PKRSC transferred to master minter. You will receive {pkrAmount} PKR in your bank.
                    </p>
                    {pendingTxHash && (
                      <a
                        href={`https://basescan.org/tx/${pendingTxHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline mt-1 block"
                      >
                        View on BaseScan
                      </a>
                    )}
                    <Badge variant="secondary" className="mt-2">
                      Awaiting Burn & PKR Bank Transfer
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { useAccount, useSignMessage } from 'wagmi'
import { WalletConnect } from './WalletConnect'

export function WhitelistForm() {
  const { toast } = useToast()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showVerification, setShowVerification] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isConnected || !address) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive"
      })
      return
    }

    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address",
        variant: "destructive"
      })
      return
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Error",
        description: "Please enter a valid email address",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Create message to sign
      const nonce = Date.now().toString()
      const message = `PKRSC Whitelist Request\nWallet: ${address}\nEmail: ${email}\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`
      
      console.log('Requesting signature for message:', message)
      
      // Request signature from user
      let signature: string
      try {
        if (!address) throw new Error('No wallet address')
        signature = await signMessageAsync({ 
          message,
          account: address
        })
        console.log('Signature received:', signature.substring(0, 20) + '...')
      } catch (signError: any) {
        console.error('Signature error:', signError)
        toast({
          title: "Signature Cancelled",
          description: signError?.message || "Please sign the message in your wallet to verify ownership",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      console.log('Submitting whitelist request...')
      
      // Submit the request with signature
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/whitelist-requests',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-signature': signature,
            'x-signature-message': btoa(message),
            'x-nonce': nonce,
          },
          body: JSON.stringify({
            walletAddress: address.toLowerCase(),
            email: email.toLowerCase(),
          }),
        }
      )

      const data = await response.json()
      console.log('Response:', response.status, data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit whitelist request')
      }

      // Show verification UI
      setShowVerification(true)
      toast({
        title: "Verification Email Sent! 📧",
        description: data.message || "Please check your email for the 6-digit verification code.",
      })

    } catch (error: any) {
      console.error('Error submitting whitelist request:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit request. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit verification code",
        variant: "destructive"
      })
      return
    }

    setIsVerifying(true)

    try {
      const response = await fetch(
        'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/verify-email',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            walletAddress: address?.toLowerCase(),
            verificationCode,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify email')
      }

      setIsVerified(true)
      toast({
        title: "Email Verified! ✅",
        description: "Your request is now under review by our admin team.",
      })

    } catch (error: any) {
      console.error('Error verifying email:', error)
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendCode = async () => {
    // Re-submit the form to get a new code
    setShowVerification(false)
    setVerificationCode('')
    await handleSubmit(new Event('submit') as any)
  }

  return (
    <div className="w-full">
      {!isConnected ? (
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground mb-4">
              Please connect your wallet to submit a whitelist request. You'll need to sign a message to verify wallet ownership.
            </p>
            <WalletConnect />
          </div>
        </div>
      ) : isVerified ? (
        <div className="text-center space-y-4 p-8">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-crypto-green animate-in zoom-in duration-300" />
          </div>
          <h3 className="text-2xl font-bold text-crypto-green">Request Under Review</h3>
          <p className="text-muted-foreground">
            Your whitelist request is being processed by our admin team. We'll notify you via email once approved.
          </p>
          <div className="mt-6 p-4 bg-muted/30 rounded-lg border border-primary/20">
            <p className="text-sm text-muted-foreground">
              <strong>Wallet:</strong> {address}
            </p>
          </div>
        </div>
      ) : showVerification ? (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="p-4 bg-crypto-green/10 border border-crypto-green/20 rounded-lg mb-4 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-crypto-green" />
              <p className="text-sm font-semibold text-crypto-green">
                Verification Code Sent
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              We've sent a 6-digit code to <strong>{email}</strong>. Please enter it below.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="verificationCode">
              Verification Code <span className="text-destructive">*</span>
            </Label>
            <Input
              id="verificationCode"
              type="text"
              placeholder="000000"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={isVerifying}
              required
              maxLength={6}
              className="text-center text-2xl tracking-widest font-mono"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              ⏱️ Code expires in 15 minutes. Maximum 5 attempts.
            </p>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={isVerifying || verificationCode.length !== 6}
          >
            {isVerifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Email'
            )}
          </Button>

          <Button 
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResendCode}
            disabled={isVerifying}
          >
            Didn't receive code? Resend
          </Button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-crypto-green/10 border border-crypto-green/20 rounded-lg mb-4">
            <p className="text-sm text-crypto-green">
              ✓ Wallet Connected! Please enter your email below to submit your whitelist request.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="walletAddress">Connected Wallet</Label>
            <Input
              id="walletAddress"
              type="text"
              value={address || ''}
              disabled
              className="font-mono text-sm bg-muted"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSubmitting}
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You'll receive a verification code and updates about your whitelist status
            </p>
          </div>
          <Button 
            type="submit" 
            className="w-full"
            disabled={isSubmitting || !email.trim()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </form>
      )}
    </div>
  )
}
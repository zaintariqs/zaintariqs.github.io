import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useAccount, useSignMessage } from 'wagmi'
import { WalletConnect } from './WalletConnect'

export function WhitelistForm() {
  const { toast } = useToast()
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

      toast({
        title: "Success",
        description: "Your whitelist request has been submitted. You will receive an email once it's reviewed.",
      })

      setEmail('')
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
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
            />
            <p className="text-xs text-muted-foreground">
              You'll receive updates about your whitelist status at this email
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
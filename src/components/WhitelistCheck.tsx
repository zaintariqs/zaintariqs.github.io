import { useEffect, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface WhitelistCheckProps {
  children: React.ReactNode
}

export function WhitelistCheck({ children }: WhitelistCheckProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const navigate = useNavigate()
  const [isChecking, setIsChecking] = useState(true)
  const [whitelistStatus, setWhitelistStatus] = useState<{
    isWhitelisted: boolean
    isAdmin: boolean
    status: string | null
    rejectionReason: string | null
  } | null>(null)

  useEffect(() => {
    const checkWhitelistStatus = async () => {
      if (!isConnected || !address) {
        setIsChecking(false)
        return
      }

      setIsChecking(true)

      try {
        const response = await fetch(
          'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/check-whitelist',
          {
            method: 'GET',
            headers: {
              'x-wallet-address': address,
            },
          }
        )

        if (!response.ok) {
          throw new Error('Failed to check whitelist status')
        }

        const data = await response.json()
        setWhitelistStatus(data)
      } catch (error) {
        console.error('Error checking whitelist status:', error)
      } finally {
        setIsChecking(false)
      }
    }

    checkWhitelistStatus()
  }, [address, isConnected])

  const handleDisconnect = () => {
    disconnect()
    navigate('/')
  }

  if (!isConnected) {
    return <>{children}</>
  }

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-dark flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mb-4" />
            <p className="text-muted-foreground">Verifying whitelist status...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Admin bypass
  if (whitelistStatus?.isAdmin) {
    return <>{children}</>
  }

  // Approved whitelist
  if (whitelistStatus?.isWhitelisted) {
    return <>{children}</>
  }

  // Not whitelisted - show error
  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            Your wallet address is not whitelisted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertDescription>
              {whitelistStatus?.status === 'pending' ? (
                'Your whitelist request is pending review. You will receive an email notification once it has been processed.'
              ) : whitelistStatus?.status === 'rejected' ? (
                <>
                  Your whitelist request was rejected.
                  {whitelistStatus.rejectionReason && (
                    <div className="mt-2">
                      <strong>Reason:</strong> {whitelistStatus.rejectionReason}
                    </div>
                  )}
                </>
              ) : (
                'Your wallet address is not whitelisted. Please apply for whitelist approval on the home page.'
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              To access PKRSC services, you need to:
            </p>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>Disconnect your current wallet</li>
              <li>Go to the home page</li>
              <li>Submit a whitelist application with your wallet address and email</li>
              <li>Wait for admin approval</li>
              <li>Check your email for approval notification</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleDisconnect} className="flex-1">
              Disconnect Wallet
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="flex-1">
              Go to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
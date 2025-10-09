import { useState, useEffect } from 'react'
import { useAccount, useConnect, useDisconnect, useBalance, useChainId } from 'wagmi'
import FingerprintJS from '@fingerprintjs/fingerprintjs'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Wallet, ChevronDown, Copy, LogOut, Network, AlertTriangle, X } from 'lucide-react'
import { supportedChains } from '@/lib/web3-config'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const { toast } = useToast()
  const [showBlacklistDialog, setShowBlacklistDialog] = useState(false)
  const [blacklistReason, setBlacklistReason] = useState('')
  
  const { data: balance } = useBalance({
    address: address,
  })

  const currentChain = supportedChains.find(chain => chain.id === chainId)

  // Check if wallet is blacklisted on connection and log login attempt
  useEffect(() => {
    const checkBlacklistAndLogLogin = async () => {
      if (!address) return

      try {
        // Generate fingerprint
        const fp = await FingerprintJS.load()
        const result = await fp.get()
        const fingerprint = result.visitorId

        // Sign a message to verify wallet ownership
        const message = `Login to PKRSC at ${new Date().toISOString()}`
        let signature: string
        
        try {
          // @ts-ignore - wagmi provides this
          const provider = await window.ethereum
          if (!provider) throw new Error('No wallet provider found')
          
          signature = await provider.request({
            method: 'personal_sign',
            params: [message, address]
          })
        } catch (signError) {
          console.error('Failed to sign login message:', signError)
          // Continue without logging if user rejects signature
          return
        }

        // Log verified login attempt
        const { error: logError } = await supabase.functions.invoke('log-login-attempt', {
          body: { 
            walletAddress: address,
            fingerprint,
            signature,
            message
          }
        })
        
        if (logError) {
          console.error('Failed to log login attempt:', logError)
        }

        // Check blacklist
        const { data, error } = await supabase.functions.invoke('check-blacklist', {
          body: { walletAddress: address }
        })

        if (error) {
          console.error('Error checking blacklist:', error)
          return
        }

        if (data?.isBlacklisted) {
          setBlacklistReason(data.reason || 'No reason provided')
          setShowBlacklistDialog(true)
          // Do not auto-disconnect to keep the dialog visible until user closes it
        }
      } catch (error) {
        console.error('Error in wallet connection process:', error)
      }
    }

    checkBlacklistAndLogLogin()
  }, [address, disconnect])
  
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const formatBalance = (balance: any) => {
    if (!balance) return '0'
    return parseFloat(balance.formatted).toFixed(4)
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      })
    }
  }

  if (isConnected && address) {
    return (
      <>
        <AlertDialog open={showBlacklistDialog}>
          <AlertDialogContent className="bg-crypto-dark border-destructive">
            <button
              onClick={() => setShowBlacklistDialog(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4 text-gray-400 hover:text-white" />
              <span className="sr-only">Close</span>
            </button>
            
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-6 w-6" />
                <AlertDialogTitle>Access Denied</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="space-y-4 text-gray-300">
                <p className="text-base">Your wallet address has been restricted from accessing PKRSC services.</p>
                
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                  <p className="text-sm font-medium text-destructive mb-2">Reason:</p>
                  <p className="text-sm text-gray-200">{blacklistReason}</p>
                </div>

                <p className="text-sm text-gray-400">
                  If you believe this is a mistake or have questions, please contact our legal team.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <Button 
                onClick={() => window.location.href = 'mailto:legal@pkrsc.org'}
                className="bg-crypto-green hover:bg-crypto-green/90 text-white w-full sm:w-auto"
              >
                Contact Us
              </Button>
              <Button 
                onClick={() => setShowBlacklistDialog(false)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="bg-crypto-dark border-crypto-gray text-white hover:bg-crypto-gray">
            <Wallet className="h-4 w-4 mr-2" />
            {formatAddress(address)}
            <ChevronDown className="h-4 w-4 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-80 bg-crypto-dark border-crypto-gray">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Wallet Address</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={copyAddress}
                className="h-auto p-1 text-gray-400 hover:text-white"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="font-mono text-sm text-white">
              {formatAddress(address)}
            </div>
            
            <DropdownMenuSeparator className="bg-crypto-gray" />
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Network</span>
                <div className="flex items-center text-crypto-green text-sm">
                  <Network className="h-3 w-3 mr-1" />
                  {currentChain?.name || 'Unknown'}
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">Balance</span>
                <div className="text-sm text-white font-medium">
                  {formatBalance(balance)} {balance?.symbol || 'ETH'}
                </div>
              </div>
            </div>
          </div>
          
          <DropdownMenuSeparator className="bg-crypto-gray" />
          
          <DropdownMenuItem 
            onClick={() => disconnect()}
            className="text-red-400 hover:text-red-300 hover:bg-crypto-gray cursor-pointer"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </>
    )
  }

  return (
    <>
      <AlertDialog open={showBlacklistDialog}>
        <AlertDialogContent className="bg-crypto-dark border-destructive">
          <button
            onClick={() => setShowBlacklistDialog(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-white" />
            <span className="sr-only">Close</span>
          </button>
          
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <AlertDialogTitle>Access Denied</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4 text-gray-300">
              <p className="text-base">Your wallet address has been restricted from accessing PKRSC services.</p>
              
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-sm font-medium text-destructive mb-2">Reason:</p>
                <p className="text-sm text-gray-200">{blacklistReason}</p>
              </div>

              <p className="text-sm text-gray-400">
                If you believe this is a mistake or have questions, please contact our legal team.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => window.location.href = 'mailto:legal@pkrsc.org'}
              className="bg-crypto-green hover:bg-crypto-green/90 text-white w-full sm:w-auto"
            >
              Contact Us
            </Button>
            <Button 
              onClick={() => setShowBlacklistDialog(false)}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Close
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="bg-crypto-green hover:bg-crypto-green/90 text-white">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-crypto-dark border-crypto-gray">
          {connectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              className="text-white hover:bg-crypto-gray cursor-pointer"
            >
              <Wallet className="h-4 w-4 mr-2" />
              {connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
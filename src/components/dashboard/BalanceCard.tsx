import { useState, useEffect } from 'react'
import { useAccount, useBalance, useChainId, useReadContract } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Wallet, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supportedChains } from '@/lib/web3-config'
import { formatUnits } from 'viem'
import { useToast } from '@/hooks/use-toast'
import MetaMaskIcon from '@/assets/metamask-icon.svg'

export function BalanceCard() {
  const { address } = useAccount()
  const chainId = useChainId()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const { toast } = useToast()
  
  const { data: ethBalance, refetch } = useBalance({
    address: address,
  })

  const currentChain = supportedChains.find(chain => chain.id === chainId)

  // PKRSC Contract Address
  const PKRSC_CONTRACT_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'

  // ERC20 ABI for balanceOf function
  const erc20Abi = [
    {
      inputs: [{ name: 'account', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view',
      type: 'function',
    },
    {
      inputs: [],
      name: 'decimals',
      outputs: [{ name: '', type: 'uint8' }],
      stateMutability: 'view',
      type: 'function',
    },
  ] as const

  // Read PKRSC balance from contract
  const { data: pkrscBalance, refetch: refetchPkrsc } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : ['0x0000000000000000000000000000000000000000'],
  })

  // Read PKRSC decimals
  const { data: pkrscDecimals } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: erc20Abi,
    functionName: 'decimals',
  })

  // Format PKRSC balance  
  const formattedPkrscBalance = pkrscBalance && pkrscDecimals 
    ? parseFloat(formatUnits(pkrscBalance, pkrscDecimals)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '0.00'

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetch(), refetchPkrsc()])
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const handleAddToMetaMask = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const wasAdded = await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: PKRSC_CONTRACT_ADDRESS,
              symbol: 'PKRSC',
              decimals: pkrscDecimals || 18,
              image: 'https://cdn-icons-png.flaticon.com/512/825/825532.png',
            },
          },
        })
        
        if (wasAdded) {
          toast({
            title: "Token Added",
            description: "PKRSC has been added to your MetaMask wallet!",
          })
        }
      } else {
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask to add this token.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add token to MetaMask. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-card-foreground">
          Wallet Balance
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Network Info */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Network</span>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-crypto-cyan/10 text-crypto-cyan border-crypto-cyan/20">
              {currentChain?.name || 'Unknown'}
            </Badge>
            <Button 
              onClick={handleAddToMetaMask}
              variant="outline" 
              size="sm"
              className="h-5 w-6 p-0"
              title="Add PKRSC to MetaMask"
            >
              <img src={MetaMaskIcon} alt="MetaMask" className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* PKRSC Balance */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-crypto-cyan" />
            <span className="text-sm font-medium text-card-foreground">PKRSC Balance</span>
          </div>
          <div className="text-3xl font-bold text-crypto-green">
            {formattedPkrscBalance} PKRSC
          </div>
          <div className="text-sm text-muted-foreground">
            ≈ PKR {formattedPkrscBalance}
          </div>
        </div>

        {/* Native Token Balance */}
        <div className="pt-4 border-t border-border">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">
              {ethBalance?.symbol || 'ETH'}
            </span>
            <span className="text-sm font-medium text-card-foreground">
              {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : '0.0000'}
            </span>
          </div>
        </div>

        {/* Wallet Address */}
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground">Wallet Address</div>
          <div className="text-xs font-mono text-card-foreground break-all">
            {address}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
import { useState } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Shield, Coins, Flame, Ban, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { parseUnits } from 'viem'
import { supportedChains } from '@/lib/web3-config'

const MASTER_MINTER_ADDRESS = '0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F'
const PKRSC_CONTRACT_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'

// ERC20 with minting/burning/blacklisting functions ABI
const pkrscAbi = [
  {
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'mint',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'burn',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    name: 'burnFrom',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'blacklist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'unBlacklist',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'isBlacklisted',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function AdminSection() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  const { writeContract, isPending, data: hash } = useWriteContract()
  
  const currentChain = supportedChains.find(chain => chain.id === chainId)
  
  const [mintTo, setMintTo] = useState('')
  const [mintAmount, setMintAmount] = useState('')
  const [burnAmount, setBurnAmount] = useState('')
  const [burnFromAddress, setBurnFromAddress] = useState('')
  const [burnFromAmount, setBurnFromAmount] = useState('')
  const [blacklistAddress, setBlacklistAddress] = useState('')
  const [unblacklistAddress, setUnblacklistAddress] = useState('')

  // Check if current user is admin
  const isAdmin = address?.toLowerCase() === MASTER_MINTER_ADDRESS.toLowerCase()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  if (!isAdmin) {
    return null
  }

  const handleMint = async () => {
    if (!mintTo || !mintAmount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const amount = parseUnits(mintAmount, 18) // Assuming 18 decimals
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'mint',
        args: [mintTo as `0x${string}`, amount],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      toast({
        title: "Minting tokens",
        description: `Minting ${mintAmount} PKRSC to ${mintTo}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mint tokens",
        variant: "destructive",
      })
    }
  }

  const handleBurn = async () => {
    if (!burnAmount) {
      toast({
        title: "Error", 
        description: "Please enter burn amount",
        variant: "destructive",
      })
      return
    }

    try {
      const amount = parseUnits(burnAmount, 18)
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'burn',
        args: [amount],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      toast({
        title: "Burning tokens",
        description: `Burning ${burnAmount} PKRSC from your wallet`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to burn tokens",
        variant: "destructive",
      })
    }
  }

  const handleBurnFrom = async () => {
    if (!burnFromAddress || !burnFromAmount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      const amount = parseUnits(burnFromAmount, 18)
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'burnFrom',
        args: [burnFromAddress as `0x${string}`, amount],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      toast({
        title: "Burning tokens",
        description: `Burning ${burnFromAmount} PKRSC from ${burnFromAddress}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to burn tokens from address",
        variant: "destructive",
      })
    }
  }

  const handleBlacklist = async () => {
    if (!blacklistAddress) {
      toast({
        title: "Error",
        description: "Please enter an address to blacklist",
        variant: "destructive",
      })
      return
    }

    try {
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'blacklist',
        args: [blacklistAddress as `0x${string}`],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      toast({
        title: "Blacklisting address",
        description: `Blacklisting ${blacklistAddress}`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to blacklist address",
        variant: "destructive",
      })
    }
  }

  const handleUnblacklist = async () => {
    if (!unblacklistAddress) {
      toast({
        title: "Error",
        description: "Please enter an address to unblacklist",
        variant: "destructive",
      })
      return
    }

    try {
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'unBlacklist',
        args: [unblacklistAddress as `0x${string}`],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      toast({
        title: "Unblacklisting address",
        description: `Removing ${unblacklistAddress} from blacklist`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unblacklist address",
        variant: "destructive",
      })
    }
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <CardTitle className="text-card-foreground">Admin Functions</CardTitle>
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Master Minter
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mint" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="mint" className="flex items-center gap-1">
              <Coins className="h-4 w-4" />
              Mint
            </TabsTrigger>
            <TabsTrigger value="burn" className="flex items-center gap-1">
              <Flame className="h-4 w-4" />
              Burn
            </TabsTrigger>
            <TabsTrigger value="blacklist" className="flex items-center gap-1">
              <Ban className="h-4 w-4" />
              Blacklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mint" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="mint-to">Mint To Address</Label>
              <Input
                id="mint-to"
                placeholder="0x..."
                value={mintTo}
                onChange={(e) => setMintTo(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mint-amount">Amount (PKRSC)</Label>
              <Input
                id="mint-amount"
                type="number"
                placeholder="1000"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
              />
            </div>
            <Button 
              onClick={handleMint} 
              disabled={isPending || isConfirming}
              className="w-full"
            >
              {isPending || isConfirming ? 'Minting...' : 'Mint Tokens'}
            </Button>
          </TabsContent>

          <TabsContent value="burn" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="burn-amount">Burn From Your Wallet (PKRSC)</Label>
                <Input
                  id="burn-amount"
                  type="number"
                  placeholder="1000"
                  value={burnAmount}
                  onChange={(e) => setBurnAmount(e.target.value)}
                />
                <Button 
                  onClick={handleBurn} 
                  disabled={isPending || isConfirming}
                  variant="destructive"
                  className="w-full"
                >
                  {isPending || isConfirming ? 'Burning...' : 'Burn Your Tokens'}
                </Button>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="burn-from-address">Burn From Address</Label>
                <Input
                  id="burn-from-address"
                  placeholder="0x..."
                  value={burnFromAddress}
                  onChange={(e) => setBurnFromAddress(e.target.value)}
                />
                <Label htmlFor="burn-from-amount">Amount (PKRSC)</Label>
                <Input
                  id="burn-from-amount"
                  type="number"
                  placeholder="1000"
                  value={burnFromAmount}
                  onChange={(e) => setBurnFromAmount(e.target.value)}
                />
                <Button 
                  onClick={handleBurnFrom} 
                  disabled={isPending || isConfirming}
                  variant="destructive"
                  className="w-full"
                >
                  {isPending || isConfirming ? 'Burning...' : 'Burn From Address'}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="blacklist" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blacklist-address">Blacklist Address</Label>
                <Input
                  id="blacklist-address"
                  placeholder="0x..."
                  value={blacklistAddress}
                  onChange={(e) => setBlacklistAddress(e.target.value)}
                />
                <Button 
                  onClick={handleBlacklist} 
                  disabled={isPending || isConfirming}
                  variant="destructive"
                  className="w-full"
                >
                  {isPending || isConfirming ? 'Blacklisting...' : 'Blacklist Address'}
                </Button>
              </div>
              
              <div className="border-t pt-4 space-y-2">
                <Label htmlFor="unblacklist-address">Remove From Blacklist</Label>
                <Input
                  id="unblacklist-address"
                  placeholder="0x..."
                  value={unblacklistAddress}
                  onChange={(e) => setUnblacklistAddress(e.target.value)}
                />
                <Button 
                  onClick={handleUnblacklist} 
                  disabled={isPending || isConfirming}
                  className="w-full"
                >
                  {isPending || isConfirming ? 'Unblacklisting...' : 'Remove From Blacklist'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
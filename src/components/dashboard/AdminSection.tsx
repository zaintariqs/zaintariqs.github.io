import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId, useReadContract } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Coins, Flame, Ban, AlertTriangle, TrendingUp, Download, DollarSign, BarChart3, Landmark, PieChart as PieChartIcon, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { parseUnits, formatUnits } from 'viem'
import { supportedChains } from '@/lib/web3-config'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Cell, Pie } from 'recharts'
import { supabase } from '@/integrations/supabase/client'
import { base } from 'wagmi/chains'
import { BankReserves } from './BankReserves'
import { AdminWalletManagement } from './AdminWalletManagement'
import { BlacklistedAddressesList } from './BlacklistedAddressesList'

const PKRSC_CONTRACT_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'

// ERC20 with minting/burning/blacklisting functions ABI
const pkrscAbi = [
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
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

type BlacklistReason = 'fraud' | 'compliance' | 'security' | 'suspicious_activity' | 'other'

interface BlacklistEntry {
  address: string
  reason: BlacklistReason
  description: string
  timestamp: Date
}

export function AdminSection() {
  const { address } = useAccount()
  const chainId = useChainId()
  const { toast } = useToast()
  const { writeContract, isPending, data: hash } = useWriteContract()
  
  const currentChain = supportedChains.find(chain => chain.id === chainId)
  
  // Server-side admin verification and master minter state
  const [isAdmin, setIsAdmin] = useState(false)
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true)
  const [masterMinterAddress, setMasterMinterAddress] = useState<string>('')
  
  // Read contract data
  const { data: decimals, error: decimalsError } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'decimals',
    chainId: base.id,
  })
  
  const { data: totalSupply, error: totalSupplyError, refetch: refetchTotalSupply } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'totalSupply',
    chainId: base.id,
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  })
  
  const { data: treasuryBalance, error: treasuryError, refetch: refetchTreasury } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'balanceOf',
    args: masterMinterAddress ? [masterMinterAddress as `0x${string}`] : ['0x0000000000000000000000000000000000000000' as `0x${string}`],
    chainId: base.id,
    query: {
      enabled: !!masterMinterAddress,
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  })

  // Read dead address balance (burned tokens)
  const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD'
  const { data: deadBalance, refetch: refetchDeadBalance } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'balanceOf',
    args: [DEAD_ADDRESS as `0x${string}`],
    chainId: base.id,
    query: {
      refetchInterval: 10000, // Refetch every 10 seconds
    }
  })

  // Log contract read errors
  useEffect(() => {
    if (decimalsError) console.error('Error reading decimals:', decimalsError)
    if (totalSupplyError) console.error('Error reading totalSupply:', totalSupplyError)
    if (treasuryError) console.error('Error reading treasury balance:', treasuryError)
    
    console.log('Contract reads:', {
      decimals,
      totalSupply: totalSupply?.toString(),
      treasuryBalance: treasuryBalance?.toString(),
      chainId,
      address
    })
  }, [decimals, totalSupply, treasuryBalance, decimalsError, totalSupplyError, treasuryError, chainId, address])

  // Log contract read errors
  useEffect(() => {
    if (decimalsError) console.error('Error reading decimals:', decimalsError)
    if (totalSupplyError) console.error('Error reading totalSupply:', totalSupplyError)
    if (treasuryError) console.error('Error reading treasury balance:', treasuryError)
    
    console.log('Contract reads:', {
      decimals,
      totalSupply: totalSupply?.toString(),
      treasuryBalance: treasuryBalance?.toString(),
      chainId,
      address
    })
  }, [decimals, totalSupply, treasuryBalance, decimalsError, totalSupplyError, treasuryError, chainId, address])
  
  const tokenDecimals = typeof decimals === 'number' ? decimals : Number((decimals as any) ?? 6)
  
  // State for admin functions
  const [mintTo, setMintTo] = useState('')
  const [mintAmount, setMintAmount] = useState('')
  const [burnAmount, setBurnAmount] = useState('')
  const [burnFromAddress, setBurnFromAddress] = useState('')
  const [burnFromAmount, setBurnFromAmount] = useState('')
  const [blacklistAddress, setBlacklistAddress] = useState('')
  const [blacklistReason, setBlacklistReason] = useState<BlacklistReason>('fraud')
  const [blacklistDescription, setBlacklistDescription] = useState('')
  const [unblacklistAddress, setUnblacklistAddress] = useState('')
  
  // Local storage for tracking
  const [blacklistedAddresses, setBlacklistedAddresses] = useState<BlacklistEntry[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  
  // User transactions from database
  const [userDeposits, setUserDeposits] = useState<any[]>([])
  const [userRedemptions, setUserRedemptions] = useState<any[]>([])

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  const { isLoading: isConfirming, isSuccess: isConfirmed, data: txReceipt } = useWaitForTransactionReceipt({
    hash,
    chainId: base.id,
  })

  // Refetch contract data when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      console.log('Transaction confirmed on Base, refetching contract data...')
      refetchTotalSupply()
      refetchTreasury()
    }
  }, [isConfirmed, refetchTotalSupply, refetchTreasury])

  // Verify admin status and fetch master minter address on mount
  useEffect(() => {
    const verifyAdmin = async () => {
      if (!address) {
        setIsAdmin(false)
        setIsCheckingAdmin(false)
        return
      }

      try {
        console.log('[AdminSection] Verifying admin status for:', address)
        
        // Fetch master minter address from secure database function
        const { data: masterMinter, error: masterMinterError } = await supabase.rpc('get_master_minter_address')
        if (!masterMinterError && masterMinter) {
          setMasterMinterAddress(masterMinter)
        }
        
        const { data, error } = await supabase.functions.invoke('verify-admin-wallet', {
          headers: {
            'x-wallet-address': address
          }
        })

        if (error) {
          console.error('[AdminSection] Admin verification error:', error)
          setIsAdmin(false)
        } else {
          console.log('[AdminSection] Admin verification result:', data)
          setIsAdmin(data?.isAdmin || false)
        }
      } catch (error) {
        console.error('[AdminSection] Failed to verify admin:', error)
        setIsAdmin(false)
      } finally {
        setIsCheckingAdmin(false)
      }
    }

    verifyAdmin()
  }, [address, supabase])

  useEffect(() => {
    // Load data from localStorage
    const storedBlacklist = localStorage.getItem('pkrsc-blacklist')
    if (storedBlacklist) {
      setBlacklistedAddresses(JSON.parse(storedBlacklist))
    }
    
    const storedTx = localStorage.getItem('pkrsc-transactions')
    if (storedTx) {
      setTransactions(JSON.parse(storedTx))
    }
  }, [])

  // Fetch user deposits and redemptions
  useEffect(() => {
    const fetchUserTransactions = async () => {
      if (!address) return

      try {
        // Fetch all deposits
        const { data: deposits, error: depositsError } = await supabase.functions.invoke('admin-deposits', {
          headers: {
            'x-wallet-address': address
          }
        })

        if (!depositsError && deposits?.data) {
          setUserDeposits(deposits.data)
        }

        // Fetch all redemptions
        const { data: redemptions, error: redemptionsError } = await supabase.functions.invoke('admin-redemptions', {
          headers: {
            'x-wallet-address': address
          }
        })

        if (!redemptionsError && redemptions?.data) {
          setUserRedemptions(redemptions.data)
        }
      } catch (error) {
        console.error('Error fetching user transactions:', error)
      }
    }

    if (isAdmin) {
      fetchUserTransactions()
    }
  }, [address, isAdmin])

  const saveBlacklistEntry = (entry: BlacklistEntry) => {
    const updated = [...blacklistedAddresses, entry]
    setBlacklistedAddresses(updated)
    localStorage.setItem('pkrsc-blacklist', JSON.stringify(updated))
  }

  const removeBlacklistEntry = (address: string) => {
    const updated = blacklistedAddresses.filter(entry => entry.address.toLowerCase() !== address.toLowerCase())
    setBlacklistedAddresses(updated)
    localStorage.setItem('pkrsc-blacklist', JSON.stringify(updated))
  }

  const addTransaction = (type: string, amount: string, address?: string, hash?: string) => {
    const tx = {
      id: Date.now(),
      type,
      amount,
      address,
      hash,
      timestamp: new Date().toISOString(),
      admin: masterMinterAddress
    }
    const updated = [tx, ...transactions]
    setTransactions(updated)
    localStorage.setItem('pkrsc-transactions', JSON.stringify(updated))
  }

  if (isCheckingAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="text-muted-foreground">Verifying admin privileges...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

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
      const amount = parseUnits(mintAmount, tokenDecimals)
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'mint',
        args: [mintTo as `0x${string}`, amount],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      addTransaction('mint', mintAmount, mintTo, hash)
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
      const amount = parseUnits(burnAmount, tokenDecimals)
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'burn',
        args: [amount],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      addTransaction('burn', burnAmount, address, hash)
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
      const amount = parseUnits(burnFromAmount, tokenDecimals)
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'burnFrom',
        args: [burnFromAddress as `0x${string}`, amount],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      addTransaction('burnFrom', burnFromAmount, burnFromAddress, hash)
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
    if (!blacklistAddress || !blacklistDescription) {
      toast({
        title: "Error",
        description: "Please enter address and reason for blacklisting",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await supabase.functions.invoke('blacklist-user', {
        body: {
          walletAddress: blacklistAddress,
          reason: `${blacklistReason}: ${blacklistDescription}`
        },
        headers: {
          'x-wallet-address': address || ''
        }
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to blacklist user')
      }
      
      saveBlacklistEntry({
        address: blacklistAddress,
        reason: blacklistReason,
        description: blacklistDescription,
        timestamp: new Date()
      })
      
      toast({
        title: "Address Blacklisted",
        description: `${blacklistAddress} has been blacklisted. ${response.data.emailSent ? 'Email notification sent.' : ''}`,
      })

      setBlacklistAddress('')
      setBlacklistDescription('')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to blacklist address",
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
      const response = await supabase.functions.invoke('unblacklist-user', {
        body: {
          walletAddress: unblacklistAddress
        },
        headers: {
          'x-wallet-address': address || ''
        }
      })

      if (response.error) {
        throw new Error(response.error.message || 'Failed to unblacklist user')
      }
      
      removeBlacklistEntry(unblacklistAddress)
      toast({
        title: "Address Unblacklisted",
        description: `${unblacklistAddress} has been removed from blacklist`,
      })

      setUnblacklistAddress('')
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to unblacklist address",
        variant: "destructive",
      })
    }
  }

  const generatePDF = () => {
    const content = `
PKRSC Transaction Report
Generated: ${new Date().toLocaleString()}
Admin: ${masterMinterAddress}

=== TREASURY OVERVIEW ===
Total Supply: ${totalSupply ? formatUnits(totalSupply, tokenDecimals) : 'Loading...'} PKRSC
Treasury Balance: ${treasuryBalance ? formatUnits(treasuryBalance, tokenDecimals) : 'Loading...'} PKRSC
Blacklisted Addresses: ${blacklistedAddresses.length}

=== TRANSACTION HISTORY ===
${transactions.map(tx => 
  `${new Date(tx.timestamp).toLocaleString()} | ${tx.type.toUpperCase()} | ${tx.amount} PKRSC | ${tx.address || 'N/A'} | ${tx.hash || 'Pending'}`
).join('\n')}

=== BLACKLISTED ADDRESSES ===
${blacklistedAddresses.map(entry => 
  `${entry.address} | ${entry.reason} | ${entry.description} | ${entry.timestamp.toLocaleString()}`
).join('\n')}
    `

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pkrsc-admin-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Report Generated",
      description: "Transaction report downloaded successfully",
    })
  }

  const generateBlacklistPDF = async () => {
    const content = `
PKRSC Blacklisted Addresses Report
Generated: ${new Date().toLocaleString()}
Admin: ${masterMinterAddress}

=== BLACKLISTED ADDRESSES SUMMARY ===
Total Blacklisted: ${blacklistedAddresses.length}

=== DETAILED BLACKLIST ===
${blacklistedAddresses.map((entry, index) => 
  `${index + 1}. Address: ${entry.address}
   Reason: ${entry.reason.toUpperCase()}
   Description: ${entry.description}
   Blacklisted: ${entry.timestamp.toLocaleString()}
   ---`
).join('\n')}

=== REASON BREAKDOWN ===
${Object.entries(blacklistedAddresses.reduce((acc, entry) => {
  acc[entry.reason] = (acc[entry.reason] || 0) + 1
  return acc
}, {} as {[key: string]: number})).map(([reason, count]) => 
  `${reason.toUpperCase()}: ${count} addresses`
).join('\n')}
    `

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pkrsc-blacklist-report-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Blacklist Report Generated",
      description: "Blacklisted addresses report downloaded successfully",
    })
  }

  // Prepare chart data
  const transactionsByType = transactions.reduce((acc, tx) => {
    acc[tx.type] = (acc[tx.type] || 0) + 1
    return acc
  }, {} as {[key: string]: number})

  const chartData = Object.entries(transactionsByType).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count
  }))

  const dailyTransactions = transactions.reduce((acc, tx) => {
    const date = new Date(tx.timestamp).toDateString()
    acc[date] = (acc[date] || 0) + 1
    return acc
  }, {} as {[key: string]: number})

  const dailyChartData = Object.entries(dailyTransactions)
    .slice(-7)
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(),
      transactions: count
    }))

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        {/* Header with Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Admin Dashboard</CardTitle>
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Master Minter
            </Badge>
          </div>
          <Button onClick={generatePDF} variant="outline" size="sm" className="shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Download Full Report
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">

      {/* Bank Reserves - Now fetching from database */}
      <BankReserves />

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* PKR Reserve Overview */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Reserve Overview</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  refetchTotalSupply()
                  refetchTreasury()
                  refetchDeadBalance()
                  toast({
                    title: "Refreshing...",
                    description: "Fetching latest on-chain data"
                  })
                }}
                title="Refresh on-chain data"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Total Supply</Label>
              <div className="text-2xl font-bold text-foreground">
                {totalSupply ? formatUnits(totalSupply, tokenDecimals) : 'Loading...'}
              </div>
              <div className="text-xs text-muted-foreground">PKRSC (on-chain)</div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">Circulating Supply</Label>
              <div className="text-2xl font-bold text-crypto-green">
                {totalSupply && treasuryBalance && deadBalance 
                  ? formatUnits((totalSupply as bigint) - (treasuryBalance as bigint) - (deadBalance as bigint), tokenDecimals)
                  : 'Loading...'}
              </div>
              <div className="text-xs text-muted-foreground">PKRSC (excludes treasury & burned)</div>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Treasury</Label>
                <div className="text-lg font-semibold text-crypto-cyan">
                  {treasuryBalance ? formatUnits(treasuryBalance, tokenDecimals) : '...'}
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Burned</Label>
                <div className="text-lg font-semibold text-orange-500">
                  {deadBalance ? formatUnits(deadBalance, tokenDecimals) : '...'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Transactions Stats */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">User Transactions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">
              All deposits & redemptions by users
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-crypto-cyan">{userDeposits.length + userRedemptions.length}</div>
                <div className="text-xs text-muted-foreground">Total Txs</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-crypto-green">
                  {userDeposits.filter(d => d.status === 'approved').length}
                </div>
                <div className="text-xs text-muted-foreground">Deposits</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-orange-500">
                  {userRedemptions.filter(r => r.status === 'completed').length}
                </div>
                <div className="text-xs text-muted-foreground">Redemptions</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-blue-500">
                  {userDeposits.filter(d => d.status === 'pending').length + userRedemptions.filter(r => ['pending', 'burn_confirmed'].includes(r.status)).length}
                </div>
                <div className="text-xs text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats - Note: This tracks admin dashboard transactions only */}
        <Card className="bg-card/50 border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Admin Dashboard Actions</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-3">
              Tracks transactions initiated from this dashboard only
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-primary">{transactions.length}</div>
                <div className="text-xs text-muted-foreground">Admin Txs</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-destructive">{blacklistedAddresses.length}</div>
                <div className="text-xs text-muted-foreground">Blacklisted</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-primary">
                  {transactions.filter(tx => tx.type === 'mint').length}
                </div>
                <div className="text-xs text-muted-foreground">Mint Ops</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-background/50">
                <div className="text-2xl font-bold text-primary">
                  {transactions.filter(tx => tx.type.includes('burn')).length}
                </div>
                <div className="text-xs text-muted-foreground">Burn Ops</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Types Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Transaction Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Transactions Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Daily Activity (Last 7 Days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="transactions" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Admin Functions */}
      <Card className="bg-card/50 border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Admin Functions</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="mint" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="mint" className="flex items-center gap-2">
                <Coins className="h-4 w-4" />
                Mint
              </TabsTrigger>
              <TabsTrigger value="burn" className="flex items-center gap-2">
                <Flame className="h-4 w-4" />
                Burn
              </TabsTrigger>
              <TabsTrigger value="blacklist" className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Blacklist
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mint" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mint-to" className="text-sm font-medium">Recipient Address</Label>
                  <Input
                    id="mint-to"
                    placeholder="0x..."
                    value={mintTo}
                    onChange={(e) => setMintTo(e.target.value)}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mint-amount" className="text-sm font-medium">Amount (PKRSC)</Label>
                  <Input
                    id="mint-amount"
                    type="number"
                    placeholder="1000"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handleMint} 
                disabled={isPending || isConfirming}
                className="w-full md:w-auto px-8"
                size="lg"
              >
                {isPending || isConfirming ? 'Minting...' : 'Mint Tokens'}
              </Button>
              
              {/* Show transaction hash after successful mint */}
              {isConfirmed && hash && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    ✓ Mint Successful!
                  </p>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Transaction Hash:</Label>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono bg-background px-2 py-1 rounded flex-1 break-all">
                        {hash}
                      </code>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(hash)
                          toast({
                            title: "Copied!",
                            description: "Transaction hash copied to clipboard",
                          })
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <a
                      href={`https://basescan.org/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View on BaseScan
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="burn" className="space-y-6">
              <div className="space-y-6">
                {/* Burn from own wallet */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-destructive" />
                    <Label className="font-medium">Burn From Your Wallet</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="burn-amount" className="text-sm font-medium">Amount (PKRSC)</Label>
                    <Input
                      id="burn-amount"
                      type="number"
                      placeholder="1000"
                      value={burnAmount}
                      onChange={(e) => setBurnAmount(e.target.value)}
                    />
                  </div>
                  <Button 
                    onClick={handleBurn} 
                    disabled={isPending || isConfirming}
                    variant="destructive"
                    className="w-full md:w-auto px-8"
                  >
                    {isPending || isConfirming ? 'Burning...' : 'Burn Your Tokens'}
                  </Button>
                </div>
                
                {/* Burn from other address */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-destructive" />
                    <Label className="font-medium">Burn From Address</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="burn-from-address" className="text-sm font-medium">Target Address</Label>
                      <Input
                        id="burn-from-address"
                        placeholder="0x..."
                        value={burnFromAddress}
                        onChange={(e) => setBurnFromAddress(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="burn-from-amount" className="text-sm font-medium">Amount (PKRSC)</Label>
                      <Input
                        id="burn-from-amount"
                        type="number"
                        placeholder="1000"
                        value={burnFromAmount}
                        onChange={(e) => setBurnFromAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleBurnFrom} 
                    disabled={isPending || isConfirming}
                    variant="destructive"
                    className="w-full md:w-auto px-8"
                  >
                    {isPending || isConfirming ? 'Burning...' : 'Burn From Address'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="blacklist" className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Ban className="h-5 w-5 text-destructive" />
                  <Label className="text-lg font-medium">Blacklist Management</Label>
                </div>
                <Button onClick={generateBlacklistPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Add to Blacklist */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Ban className="h-4 w-4 text-destructive" />
                    <Label className="font-medium">Add to Blacklist</Label>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="blacklist-address" className="text-sm font-medium">Address</Label>
                      <Input
                        id="blacklist-address"
                        placeholder="0x..."
                        value={blacklistAddress}
                        onChange={(e) => setBlacklistAddress(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blacklist-reason" className="text-sm font-medium">Reason</Label>
                      <Select value={blacklistReason} onValueChange={(value: BlacklistReason) => setBlacklistReason(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fraud">Fraud</SelectItem>
                          <SelectItem value="compliance">Compliance Violation</SelectItem>
                          <SelectItem value="security">Security Risk</SelectItem>
                          <SelectItem value="suspicious_activity">Suspicious Activity</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="blacklist-description" className="text-sm font-medium">Description</Label>
                      <Textarea
                        id="blacklist-description"
                        placeholder="Detailed reason for blacklisting..."
                        value={blacklistDescription}
                        onChange={(e) => setBlacklistDescription(e.target.value)}
                        rows={3}
                      />
                    </div>
                    <Button 
                      onClick={handleBlacklist} 
                      disabled={isPending || isConfirming}
                      variant="destructive"
                      className="w-full"
                    >
                      {isPending || isConfirming ? 'Blacklisting...' : 'Add to Blacklist'}
                    </Button>
                  </div>
                </div>
                
                {/* Remove from Blacklist */}
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-4 w-4 text-green-500" />
                    <Label className="font-medium">Remove from Blacklist</Label>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="unblacklist-address" className="text-sm font-medium">Address</Label>
                      <Input
                        id="unblacklist-address"
                        placeholder="0x..."
                        value={unblacklistAddress}
                        onChange={(e) => setUnblacklistAddress(e.target.value)}
                        className="font-mono text-sm"
                      />
                    </div>
                    <Button 
                      onClick={handleUnblacklist} 
                      disabled={isPending || isConfirming}
                      className="w-full"
                    >
                      {isPending || isConfirming ? 'Unblacklisting...' : 'Remove from Blacklist'}
                    </Button>
                  </div>

                  {/* Blacklisted Addresses List */}
                  {blacklistedAddresses.length > 0 && (
                    <div className="mt-6 pt-4 border-t">
                      <div className="flex items-center justify-between mb-3">
                        <Label className="text-sm font-medium">Blacklisted Addresses</Label>
                        <Badge variant="secondary">{blacklistedAddresses.length}</Badge>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {blacklistedAddresses.map((entry, index) => (
                          <div key={index} className="p-3 bg-muted rounded-lg text-sm">
                            <div className="font-mono text-xs truncate mb-1">{entry.address}</div>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {entry.reason.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 truncate">
                              {entry.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* All Blacklisted Addresses */}
              <div className="mt-8">
                <BlacklistedAddressesList />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Admin Wallet Management */}
      <AdminWalletManagement />

      </CardContent>
    </Card>
  )
}
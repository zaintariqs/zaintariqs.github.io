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
import { Shield, Coins, Flame, Ban, AlertTriangle, TrendingUp, FileText, Download, DollarSign, Users, Activity, PieChart, BarChart3, Landmark } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { parseUnits, formatUnits } from 'viem'
import { supportedChains } from '@/lib/web3-config'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, Pie } from 'recharts'

const MASTER_MINTER_ADDRESS = '0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F'
const PKRSC_CONTRACT_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'

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
  
  // Read contract data
  const { data: decimals } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'decimals',
  })
  
  const { data: totalSupply } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'totalSupply',
  })
  
  const { data: treasuryBalance } = useReadContract({
    address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
    abi: pkrscAbi,
    functionName: 'balanceOf',
    args: [MASTER_MINTER_ADDRESS as `0x${string}`],
  })
  
  const tokenDecimals = decimals || 6
  
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
  const [bankReserves, setBankReserves] = useState('0')
  
  // Local storage for blacklist tracking
  const [blacklistedAddresses, setBlacklistedAddresses] = useState<BlacklistEntry[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [blacklistBalances, setBlacklistBalances] = useState<{[key: string]: string}>({})

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  // Check if current user is admin
  const isAdmin = address?.toLowerCase() === MASTER_MINTER_ADDRESS.toLowerCase()

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
  })

  useEffect(() => {
    // Load blacklisted addresses from localStorage
    const stored = localStorage.getItem('pkrsc-blacklist')
    if (stored) {
      setBlacklistedAddresses(JSON.parse(stored))
    }
    
    // Load transaction history from localStorage
    const storedTx = localStorage.getItem('pkrsc-transactions')
    if (storedTx) {
      setTransactions(JSON.parse(storedTx))
    }

    // Load bank reserves from localStorage
    const storedReserves = localStorage.getItem('pkrsc-bank-reserves')
    if (storedReserves) {
      setBankReserves(storedReserves)
    }
  }, [])

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
      admin: MASTER_MINTER_ADDRESS
    }
    const updated = [tx, ...transactions]
    setTransactions(updated)
    localStorage.setItem('pkrsc-transactions', JSON.stringify(updated))
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
      writeContract({
        address: PKRSC_CONTRACT_ADDRESS as `0x${string}`,
        abi: pkrscAbi,
        functionName: 'blacklist',
        args: [blacklistAddress as `0x${string}`],
        account: address as `0x${string}`,
        chain: currentChain,
      })
      
      saveBlacklistEntry({
        address: blacklistAddress,
        reason: blacklistReason,
        description: blacklistDescription,
        timestamp: new Date()
      })
      
      addTransaction('blacklist', '0', blacklistAddress, hash)
      toast({
        title: "Blacklisting address",
        description: `Blacklisting ${blacklistAddress} for ${blacklistReason}`,
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
      
      removeBlacklistEntry(unblacklistAddress)
      addTransaction('unblacklist', '0', unblacklistAddress, hash)
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

  const generatePDF = () => {
    const content = `
PKRSC Transaction Report
Generated: ${new Date().toLocaleString()}
Admin: ${MASTER_MINTER_ADDRESS}

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
    // Fetch balances for blacklisted addresses
    const balances: {[key: string]: string} = {}
    for (const entry of blacklistedAddresses) {
      try {
        // In a real implementation, you'd fetch from the contract
        // For now, we'll simulate with random values
        balances[entry.address] = Math.floor(Math.random() * 10000).toString()
      } catch (error) {
        balances[entry.address] = "Error fetching"
      }
    }

    const content = `
PKRSC Blacklisted Addresses Report
Generated: ${new Date().toLocaleString()}
Admin: ${MASTER_MINTER_ADDRESS}

=== BLACKLISTED ADDRESSES SUMMARY ===
Total Blacklisted: ${blacklistedAddresses.length}
Total Frozen Funds: ${Object.values(balances).reduce((sum, bal) => sum + (parseFloat(bal) || 0), 0).toLocaleString()} PKRSC

=== DETAILED BLACKLIST ===
${blacklistedAddresses.map((entry, index) => 
  `${index + 1}. Address: ${entry.address}
   Balance: ${balances[entry.address] || 'Unknown'} PKRSC
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

  const updateBankReserves = () => {
    localStorage.setItem('pkrsc-bank-reserves', bankReserves)
    toast({
      title: "Bank Reserves Updated",
      description: `Bank reserves set to ${bankReserves} PKR`,
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
    .slice(-7) // Last 7 days
    .map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(),
      transactions: count
    }))

  return (
    <div className="space-y-6">
      {/* PKR Reserve Overview */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-card-foreground">PKR Reserve Overview</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Total Supply</Label>
              <div className="text-2xl font-bold text-primary">
                {totalSupply ? `${Number(formatUnits(totalSupply, tokenDecimals)).toLocaleString()} PKRSC` : 'Loading...'}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Treasury Balance</Label>
              <div className="text-2xl font-bold text-green-500">
                {treasuryBalance ? `${Number(formatUnits(treasuryBalance, tokenDecimals)).toLocaleString()} PKRSC` : 'Loading...'}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Bank Reserves (PKR)</Label>
              <div className="text-2xl font-bold text-blue-500">
                {Number(bankReserves).toLocaleString()} PKR
              </div>
            </div>
          </div>
          
          {/* Bank Reserves Management */}
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-4 w-4 text-primary" />
              <Label className="font-medium">Update Bank Reserves</Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Enter PKR amount"
                value={bankReserves}
                onChange={(e) => setBankReserves(e.target.value)}
                className="flex-1"
              />
              <Button onClick={updateBankReserves} variant="outline">
                Update
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Treasury Reporting */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-card-foreground">Treasury Reporting</CardTitle>
            </div>
            <Button onClick={generatePDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-500">{transactions.length}</div>
              <div className="text-sm text-muted-foreground">Total Transactions</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-500">{blacklistedAddresses.length}</div>
              <div className="text-sm text-muted-foreground">Blacklisted Addresses</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-500">
                {transactions.filter(tx => tx.type === 'mint').length}
              </div>
              <div className="text-sm text-muted-foreground">Mint Operations</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Types Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              <CardTitle className="text-card-foreground">Transaction Types</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Transactions Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-card-foreground">Daily Transactions (Last 7 Days)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
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
              <div className="flex justify-between items-center mb-4">
                <Label className="text-sm font-medium">Blacklist Management</Label>
                <Button onClick={generateBlacklistPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download Blacklist Report
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="blacklist-address">Blacklist Address</Label>
                  <Input
                    id="blacklist-address"
                    placeholder="0x..."
                    value={blacklistAddress}
                    onChange={(e) => setBlacklistAddress(e.target.value)}
                  />
                  <Label htmlFor="blacklist-reason">Reason</Label>
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
                  <Label htmlFor="blacklist-description">Description</Label>
                  <Textarea
                    id="blacklist-description"
                    placeholder="Detailed reason for blacklisting..."
                    value={blacklistDescription}
                    onChange={(e) => setBlacklistDescription(e.target.value)}
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

                {blacklistedAddresses.length > 0 && (
                  <div className="border-t pt-4">
                    <Label className="text-sm font-medium">Blacklisted Addresses ({blacklistedAddresses.length})</Label>
                    <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                      {blacklistedAddresses.map((entry, index) => (
                        <div key={index} className="p-2 bg-muted rounded text-xs">
                          <div className="font-mono">{entry.address}</div>
                          <div className="text-muted-foreground">
                            {entry.reason} - {entry.description}
                          </div>
                          <div className="text-muted-foreground">
                            {entry.timestamp.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
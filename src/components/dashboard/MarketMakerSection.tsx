import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Bot, TrendingUp, Activity, AlertCircle, ExternalLink, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAccount } from 'wagmi'

interface BotConfig {
  id: string
  target_price: number
  price_threshold: number
  trade_amount_usdt: number
  min_trade_interval_seconds: number
  status: 'active' | 'paused' | 'error'
  last_trade_at: string | null
}

interface Transaction {
  id: string
  transaction_hash: string
  action: string
  amount_usdt: number
  amount_pkrsc: number
  price: number
  status: string
  error_message: string | null
  created_at: string
}

interface CronStatus {
  jobname: string
  schedule: string
  active: boolean
}

export function MarketMakerSection() {
  const { toast } = useToast()
  const { address } = useAccount()
  const [config, setConfig] = useState<BotConfig | null>(null)
  const [cronStatus, setCronStatus] = useState<CronStatus | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Form state
  const [targetPrice, setTargetPrice] = useState('1.0')
  const [threshold, setThreshold] = useState('0.02')
  const [tradeAmount, setTradeAmount] = useState('100')
  const [interval, setInterval] = useState('300')

  useEffect(() => {
    fetchConfig()
    fetchTransactions()
    fetchCronStatus()

    // Subscribe to real-time updates
    const configChannel = supabase
      .channel('market_maker_config_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'market_maker_config'
      }, () => {
        fetchConfig()
      })
      .subscribe()

    const txChannel = supabase
      .channel('market_maker_tx_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'market_maker_transactions'
      }, () => {
        fetchTransactions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(configChannel)
      supabase.removeChannel(txChannel)
    }
  }, [])

  const fetchConfig = async () => {
    if (!address) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.functions.invoke('get-market-maker-config', {
        body: { walletAddress: address }
      })

      if (error) {
        console.error('Error fetching config:', error)
        toast({
          title: 'Error',
          description: 'Failed to load bot configuration',
          variant: 'destructive'
        })
      } else if (data) {
        setConfig(data)
        setTargetPrice(data.target_price.toString())
        setThreshold(data.price_threshold.toString())
        setTradeAmount(data.trade_amount_usdt.toString())
        setInterval(data.min_trade_interval_seconds.toString())
      }
    } catch (error) {
      console.error('Failed to fetch config:', error)
      toast({
        title: 'Error',
        description: 'Failed to load bot configuration',
        variant: 'destructive'
      })
    }
    setLoading(false)
  }

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('market_maker_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      setTransactions(data)
    }
  }

  const fetchCronStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_market_maker_cron_status')
      
      if (error) {
        console.error('Error fetching cron status:', error)
        return
      }
      
      if (data && data.length > 0) {
        setCronStatus(data[0])
      }
    } catch (error) {
      console.error('Error fetching cron status:', error)
    }
  }

  const toggleCronJob = async (enable: boolean) => {
    if (!address) return
    
    setUpdating(true)
    try {
      const { error } = await supabase.rpc('toggle_market_maker_cron', {
        enable
      })
      
      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to toggle automation',
          variant: 'destructive'
        })
        return
      }
      
      toast({
        title: enable ? 'Automation Enabled' : 'Automation Paused',
        description: enable 
          ? 'Bot will run automatically every 5 minutes' 
          : 'Automatic execution has been paused'
      })
      
      fetchCronStatus()
    } catch (error) {
      console.error('Error toggling cron:', error)
      toast({
        title: 'Error',
        description: 'Failed to toggle automation',
        variant: 'destructive'
      })
    }
    setUpdating(false)
  }

  const updateConfig = async (updates: Partial<BotConfig>) => {
    if (!config || !address) return

    setUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('update-market-maker-config', {
        body: { 
          walletAddress: address,
          updates 
        }
      })

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update configuration',
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Success',
          description: 'Configuration updated'
        })
        fetchConfig()
      }
    } catch (error) {
      console.error('Update failed:', error)
      toast({
        title: 'Error',
        description: 'Failed to update configuration',
        variant: 'destructive'
      })
    }
    setUpdating(false)
  }

  const toggleBot = async (active: boolean) => {
    await updateConfig({ status: active ? 'active' : 'paused' })
  }

  const saveSettings = async () => {
    await updateConfig({
      target_price: parseFloat(targetPrice),
      price_threshold: parseFloat(threshold),
      trade_amount_usdt: parseFloat(tradeAmount),
      min_trade_interval_seconds: parseInt(interval)
    })
  }

  const runBotNow = async () => {
    if (!address) {
      toast({
        title: 'Error',
        description: 'Wallet not connected',
        variant: 'destructive'
      })
      return
    }

    setUpdating(true)
    try {
      const { data, error } = await supabase.functions.invoke('market-maker', {
        body: { walletAddress: address, force: true }
      })
      
      if (error) {
        // Extract detailed error message from response
        const errorMsg = (data as any)?.error || error.message || 'Failed to run bot'
        const errorDetails = (data as any)?.details
        
        toast({
          title: 'Market Maker Error',
          description: errorDetails ? `${errorMsg}\n${errorDetails}` : errorMsg,
          variant: 'destructive'
        })
        
        // Refresh config to reflect error status
        fetchConfig()
        return
      }

      const msg = (data as any)?.message as string | undefined
      if (msg && (msg.toLowerCase().includes('circuit breaker') || msg.toLowerCase().includes('skipped'))) {
        toast({
          title: 'Bot Skipped',
          description: msg,
        })
      } else {
        toast({
          title: 'Bot Executed',
          description: msg || 'Market maker bot ran successfully'
        })
      }
      fetchTransactions()
      fetchConfig()
    } catch (error) {
      console.error('Error running bot:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to run bot',
        variant: 'destructive'
      })
    }
    setUpdating(false)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <Bot className="h-5 w-5 text-primary" />
          Market Making Bot
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Automated trading to stabilize PKRSC/USDT price
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Automation Status */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-primary/20">
          <div className="flex items-center gap-3">
            <Clock className={`h-5 w-5 ${cronStatus?.active ? 'text-crypto-green animate-pulse' : 'text-muted-foreground'}`} />
            <div>
              <div className="font-medium">Automated Scheduling</div>
              <div className="text-sm text-muted-foreground">
                {cronStatus?.active ? 'Running every 5 minutes' : 'Paused'}
              </div>
            </div>
          </div>
          <Switch 
            checked={cronStatus?.active || false}
            onCheckedChange={toggleCronJob}
            disabled={updating}
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Activity className={`h-5 w-5 ${config?.status === 'active' ? 'text-crypto-green' : 'text-muted-foreground'}`} />
            <div>
              <div className="font-medium">Bot Status</div>
              <div className="text-sm text-muted-foreground capitalize">{config?.status}</div>
            </div>
          </div>
          <Switch
            checked={config?.status === 'active'}
            onCheckedChange={toggleBot}
            disabled={updating}
          />
        </div>

        {/* Error Alert */}
        {config?.status === 'error' && (
          <div className="flex items-start gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm text-black dark:text-white">
              Bot encountered an error. Check transaction history below for details.
            </div>
          </div>
        )}

        {/* Live Forex Rate Info */}
        <div className="p-4 bg-crypto-green/10 border border-crypto-green/20 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-crypto-green" />
            <span className="font-medium text-sm">Live Forex Integration</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Bot automatically fetches live USD/PKR rates from forex APIs and maintains PKRSC price at 1 PKRSC = 1 PKR value.
            The target price below is only used as a fallback if the forex API is unavailable.
          </p>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="font-semibold text-card-foreground">Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetPrice">Fallback Target Price (USD)</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Used only if forex API fails</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Price Threshold (%)</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                value={(parseFloat(threshold) * 100).toString()}
                onChange={(e) => setThreshold((parseFloat(e.target.value) / 100).toString())}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tradeAmount">Trade Amount (USDT)</Label>
              <Input
                id="tradeAmount"
                type="number"
                step="10"
                value={tradeAmount}
                onChange={(e) => setTradeAmount(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="interval">Min Interval (seconds)</Label>
              <Input
                id="interval"
                type="number"
                step="60"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={saveSettings} disabled={updating}>
              Save Settings
            </Button>
            <Button onClick={runBotNow} disabled={updating} variant="outline">
              Run Now
            </Button>
          </div>
        </div>

        {/* Last Trade */}
        {config?.last_trade_at && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-card-foreground">Last Trade</div>
            <div className="text-xs text-muted-foreground">
              {new Date(config.last_trade_at).toLocaleString()}
            </div>
          </div>
        )}

        {/* Transaction History Table */}
        <div className="space-y-3">
          <h3 className="font-semibold text-card-foreground">Bot Trading History</h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Time</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead className="text-right">USDT</TableHead>
                  <TableHead className="text-right">PKRSC</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tx Hash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No trades executed yet. Bot will trade when price deviates from target.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} className="hover:bg-muted/20">
                      <TableCell className="text-sm">
                        {new Date(tx.created_at).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TrendingUp className={`h-4 w-4 ${
                            tx.action === 'BUY' ? 'text-crypto-green' : 'text-orange-500'
                          }`} />
                          <span className={`font-medium ${
                            tx.action === 'BUY' ? 'text-crypto-green' : 'text-orange-500'
                          }`}>
                            {tx.action}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.amount_usdt.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {tx.amount_pkrsc.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ${tx.price.toFixed(6)}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          tx.status === 'completed' 
                            ? 'bg-crypto-green/20 text-crypto-green' 
                            : 'bg-red-500/20 text-red-500'
                        }`}>
                          {tx.status}
                        </span>
                        {tx.error_message && (
                          <div className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={tx.error_message}>
                            {tx.error_message}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.transaction_hash && (
                          <a
                            href={`https://basescan.org/tx/${tx.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm"
                          >
                            <span className="font-mono">
                              {tx.transaction_hash.slice(0, 6)}...{tx.transaction_hash.slice(-4)}
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-xs text-black dark:text-white">
            <strong>Risk Warning:</strong> This bot executes real trades with your funds. 
            Monitor it closely and ensure adequate liquidity in your wallet.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

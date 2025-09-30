import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Bot, TrendingUp, Activity, AlertCircle } from 'lucide-react'
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

export function MarketMakerSection() {
  const { toast } = useToast()
  const { address } = useAccount()
  const [config, setConfig] = useState<BotConfig | null>(null)
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
      .limit(10)

    if (error) {
      console.error('Error fetching transactions:', error)
    } else if (data) {
      setTransactions(data)
    }
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
        body: { walletAddress: address }
      })
      
      if (error) throw error

      toast({
        title: 'Bot Executed',
        description: 'Market maker bot ran successfully'
      })
      fetchTransactions()
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
        {/* Status */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-3">
            <Activity className={`h-5 w-5 ${config?.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`} />
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
            <div className="text-sm text-destructive-foreground">
              Bot encountered an error. Check transaction history below for details.
            </div>
          </div>
        )}

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="font-semibold text-card-foreground">Configuration</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="targetPrice">Target Price (USD)</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
              />
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

        {/* Transaction History */}
        <div className="space-y-2">
          <h3 className="font-semibold text-card-foreground">Recent Transactions</h3>
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">
                No transactions yet
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`h-4 w-4 ${tx.action === 'BUY' ? 'text-green-500' : 'text-red-500'}`} />
                      <span className="font-medium">{tx.action}</span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      tx.status === 'completed' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {tx.amount_pkrsc.toFixed(2)} PKRSC @ ${tx.price.toFixed(4)}
                  </div>
                  {tx.error_message && (
                    <div className="text-xs text-destructive mt-1">{tx.error_message}</div>
                  )}
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(tx.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-xs text-destructive-foreground">
            <strong>Risk Warning:</strong> This bot executes real trades with your funds. 
            Monitor it closely and ensure adequate liquidity in your wallet.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

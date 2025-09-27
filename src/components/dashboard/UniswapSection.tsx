import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowUpDown, ExternalLink, TrendingUp, Zap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function UniswapSection() {
  const [fromAmount, setFromAmount] = useState('')
  const [toAmount, setToAmount] = useState('')
  const [fromToken, setFromToken] = useState('PKRSC')
  const [toToken, setToToken] = useState('USDT')
  const [isSwapping, setIsSwapping] = useState(false)
  const { toast } = useToast()

  // Mock exchange rates
  const exchangeRate = fromToken === 'PKRSC' ? 0.0036 : 277.78 // PKR to USD rate

  const handleSwap = () => {
    if (!fromAmount) {
      toast({
        title: "Enter Amount",
        description: "Please enter the amount you want to swap",
        variant: "destructive"
      })
      return
    }

    setIsSwapping(true)
    
    // Simulate swap
    setTimeout(() => {
      toast({
        title: "Swap Successful",
        description: `Successfully swapped ${fromAmount} ${fromToken} for ${toAmount} ${toToken}`,
      })
      setIsSwapping(false)
      setFromAmount('')
      setToAmount('')
    }, 2000)
  }

  const swapTokens = () => {
    const tempToken = fromToken
    setFromToken(toToken)
    setToToken(tempToken)
    setFromAmount('')
    setToAmount('')
  }

  // Calculate output amount based on input
  const calculateOutput = (input: string) => {
    if (!input) return ''
    const inputNum = parseFloat(input)
    if (fromToken === 'PKRSC') {
      return (inputNum * exchangeRate).toFixed(6)
    } else {
      return (inputNum / exchangeRate).toFixed(2)
    }
  }

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value)
    setToAmount(calculateOutput(value))
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Uniswap Trading
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Trade PKRSC with other cryptocurrencies on Uniswap
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pool Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-card-foreground">Pool TVL</div>
            <div className="text-xl font-bold text-primary">$2.4M</div>
            <div className="text-xs text-muted-foreground">Total Value Locked</div>
          </div>
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium text-card-foreground">24h Volume</div>
            <div className="text-xl font-bold text-primary">$145K</div>
            <div className="text-xs text-muted-foreground">Trading Volume</div>
          </div>
        </div>

        {/* Swap Interface */}
        <div className="space-y-4">
          {/* From Token */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={fromAmount}
                  onChange={(e) => handleFromAmountChange(e.target.value)}
                  className="text-lg"
                />
              </div>
              <div className="w-24">
                <Button
                  variant="outline"
                  className="w-full h-full font-medium"
                  onClick={() => setFromToken(fromToken === 'PKRSC' ? 'USDT' : 'PKRSC')}
                >
                  {fromToken}
                </Button>
              </div>
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={swapTokens}
              className="rounded-full p-2"
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>

          {/* To Token */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={toAmount}
                  readOnly
                  className="text-lg bg-muted/50"
                />
              </div>
              <div className="w-24">
                <Button
                  variant="outline"
                  className="w-full h-full font-medium"
                  onClick={() => setToToken(toToken === 'PKRSC' ? 'USDT' : 'PKRSC')}
                >
                  {toToken}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Trade Details */}
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Exchange Rate</span>
            <span className="text-card-foreground">
              1 {fromToken} = {fromToken === 'PKRSC' ? '0.0036' : '277.78'} {toToken}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Network Fee</span>
            <span className="text-card-foreground">~$2.50</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Slippage Tolerance</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              0.5%
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button 
            onClick={handleSwap}
            disabled={isSwapping || !fromAmount}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isSwapping ? 'Swapping...' : 'Swap Tokens'}
            <Zap className="ml-2 h-4 w-4" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => window.open('https://app.uniswap.org', '_blank')}
            className="px-6"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFromAmountChange('1000')}
            className="text-xs"
          >
            1K
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFromAmountChange('5000')}
            className="text-xs"
          >
            5K
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFromAmountChange('10000')}
            className="text-xs"
          >
            10K
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleFromAmountChange('125000')} // Max balance
            className="text-xs"
          >
            MAX
          </Button>
        </div>

        {/* Warning */}
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="text-xs text-destructive-foreground">
            <strong>Risk Warning:</strong> Cryptocurrency trading involves substantial risk. 
            Always verify pool liquidity and slippage before large trades.
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
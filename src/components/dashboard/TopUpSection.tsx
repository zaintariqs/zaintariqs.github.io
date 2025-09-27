import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Smartphone, ArrowRight } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export function TopUpSection() {
  const [amount, setAmount] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const { toast } = useToast()

  const handleTopUp = async (method: 'easypaisa' | 'jazzcash') => {
    if (!amount || !phoneNumber) {
      toast({
        title: "Missing Information",
        description: "Please enter amount and phone number",
        variant: "destructive"
      })
      return
    }

    setIsProcessing(true)
    
    // Simulate payment processing
    setTimeout(() => {
      toast({
        title: "Payment Initiated",
        description: `${method === 'easypaisa' ? 'EasyPaisa' : 'JazzCash'} payment of PKR ${amount} initiated. You'll receive PKRSC tokens shortly.`,
      })
      setIsProcessing(false)
      setAmount('')
      setPhoneNumber('')
    }, 2000)
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <CreditCard className="h-5 w-5 text-primary" />
          Top-up PKRSC
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add funds to your PKRSC balance using Pakistani payment methods
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (PKR)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg"
            />
            <div className="text-sm text-muted-foreground">
              Minimum: PKR 100 • Maximum: PKR 50,000
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+92 300 1234567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          {/* Payment Methods */}
          <Tabs defaultValue="easypaisa" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="easypaisa" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                EasyPaisa
              </TabsTrigger>
              <TabsTrigger value="jazzcash" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                JazzCash
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="easypaisa" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium text-card-foreground">EasyPaisa Payment</div>
                  <div className="text-sm text-muted-foreground">Instant PKRSC delivery</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  1.5% Fee
                </Badge>
              </div>
              <Button 
                onClick={() => handleTopUp('easypaisa')}
                disabled={isProcessing || !amount || !phoneNumber}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isProcessing ? 'Processing...' : 'Pay with EasyPaisa'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>

            <TabsContent value="jazzcash" className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium text-card-foreground">JazzCash Payment</div>
                  <div className="text-sm text-muted-foreground">Instant PKRSC delivery</div>
                </div>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  1.5% Fee
                </Badge>
              </div>
              <Button 
                onClick={() => handleTopUp('jazzcash')}
                disabled={isProcessing || !amount || !phoneNumber}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isProcessing ? 'Processing...' : 'Pay with JazzCash'}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TabsContent>
          </Tabs>

          {/* Exchange Rate */}
          <div className="p-4 bg-muted/30 rounded-lg border border-border">
            <div className="text-sm font-medium text-card-foreground mb-2">Exchange Rate</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>1 PKR = 1 PKRSC (1:1 peg)</div>
              <div>Processing time: Instant</div>
              <div>Daily limit: PKR 100,000</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
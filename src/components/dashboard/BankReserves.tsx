import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Banknote, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface BankReserve {
  id: string
  reserve_type: string
  amount: number
  last_updated: string
  updated_by?: string
}

export function BankReserves() {
  const { address } = useAccount()
  const { toast } = useToast()
  const [reserves, setReserves] = useState<BankReserve[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [manualAmount, setManualAmount] = useState('')
  const [updateMode, setUpdateMode] = useState<'set' | 'adjust'>('set')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchReserves = async () => {
    if (!address) return

    try {
      const { data, error } = await supabase.functions.invoke('get-bank-reserves', {
        body: { walletAddress: address }
      })

      if (error) throw error

      setReserves(data.reserves || [])
    } catch (error) {
      console.error('Error fetching bank reserves:', error)
      toast({
        title: "Error",
        description: "Failed to load bank reserves",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReserves()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('bank-reserves-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bank_reserves'
        },
        (payload) => {
          console.log('Bank reserves updated:', payload)
          setIsUpdating(true)
          fetchReserves()
          setTimeout(() => setIsUpdating(false), 2000)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [address])

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-primary" />
            Bank Reserves
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleManualUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!address) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      })
      return
    }
    
    if (!manualAmount || isNaN(Number(manualAmount))) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid number",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error } = await supabase.functions.invoke('update-bank-reserves', {
        body: {
          walletAddress: address,
          mode: updateMode,
          amount: Number(manualAmount)
        }
      })

      if (error) throw error

      toast({
        title: "Success",
        description: data.message || "Bank reserves updated successfully",
      })

      setManualAmount('')
      fetchReserves()
    } catch (error) {
      console.error('Error updating bank reserves:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to update bank reserves",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const pkrReserve = reserves.find(r => r.reserve_type === 'pkr')

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-primary" />
          Bank Reserves
          {isUpdating && (
            <span className="text-xs text-green-500 animate-pulse">● Updating</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pkrReserve && (
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-6 border border-primary/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">PKR Reserve</p>
                  <p className="text-3xl font-bold text-foreground">
                    PKR {pkrReserve.amount.toLocaleString()}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-full">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              {pkrReserve.last_updated && (
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <p className="text-xs text-muted-foreground">
                    Last updated: {new Date(pkrReserve.last_updated).toLocaleString()}
                  </p>
                  {pkrReserve.updated_by && (
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      By: {pkrReserve.updated_by.slice(0, 6)}...{pkrReserve.updated_by.slice(-4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              <strong>Note:</strong> PKR reserves automatically increase when deposits are approved (+) and decrease when redemptions are completed (-).
              This represents the physical PKR backing the PKRSC tokens in circulation.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <h4 className="text-sm font-semibold mb-3">Manual Reserve Update</h4>
            <form onSubmit={handleManualUpdate} className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={updateMode === 'set' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUpdateMode('set')}
                >
                  Set Amount
                </Button>
                <Button
                  type="button"
                  variant={updateMode === 'adjust' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUpdateMode('adjust')}
                >
                  Adjust Amount
                </Button>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manual-amount">
                  {updateMode === 'set' ? 'New Amount (PKR)' : 'Adjustment Amount (PKR)'}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="manual-amount"
                    type="number"
                    step="0.01"
                    placeholder={updateMode === 'set' ? 'Enter new total amount' : 'Enter adjustment (+/-)'}
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button type="submit" disabled={isSubmitting || !manualAmount}>
                    {isSubmitting ? 'Updating...' : 'Update'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {updateMode === 'set' 
                    ? 'Set the total PKR reserve to a specific amount'
                    : 'Add or subtract from the current reserve (use negative for subtract)'}
                </p>
              </div>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

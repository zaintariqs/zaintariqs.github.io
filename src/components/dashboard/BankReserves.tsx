import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
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

  const fetchReserves = async () => {
    if (!address) return

    try {
      const { data, error } = await supabase
        .from('bank_reserves')
        .select('*')
        .order('reserve_type')

      if (error) throw error

      setReserves(data || [])
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
        </div>
      </CardContent>
    </Card>
  )
}

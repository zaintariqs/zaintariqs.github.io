import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MyDeposits } from './MyDeposits'
import { MyUSDTDeposits } from './MyUSDTDeposits'
import { CreditCard, Wallet } from 'lucide-react'

export function MyDepositsWrapper() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="pkr" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pkr" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            PKR Deposits
          </TabsTrigger>
          <TabsTrigger value="usdt" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            USDT Deposits
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="pkr" className="mt-6">
          <MyDeposits />
        </TabsContent>
        
        <TabsContent value="usdt" className="mt-6">
          <MyUSDTDeposits />
        </TabsContent>
      </Tabs>
    </div>
  )
}
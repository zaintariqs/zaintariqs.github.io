import { MyDeposits } from '@/components/dashboard/MyDeposits'
import { MyRedemptions } from '@/components/dashboard/MyRedemptions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function MyActivityPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          My Activity
        </h1>
        <p className="text-muted-foreground">
          View your personal deposits and redemptions
        </p>
      </div>

      <Tabs defaultValue="deposits" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deposits">My Deposits</TabsTrigger>
          <TabsTrigger value="redemptions">My Redemptions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="deposits" className="mt-6">
          <MyDeposits />
        </TabsContent>
        
        <TabsContent value="redemptions" className="mt-6">
          <MyRedemptions />
        </TabsContent>
      </Tabs>
    </div>
  )
}

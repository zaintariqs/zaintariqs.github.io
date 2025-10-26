import { useAccount } from 'wagmi';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { V2TreasuryDashboard } from '@/components/dashboard/V2TreasuryDashboard';
import { AdminV2Deposits } from '@/components/dashboard/AdminV2Deposits';
import { AdminRedemptions } from '@/components/dashboard/AdminRedemptions';
import { TransactionFees } from '@/components/dashboard/TransactionFees';
import { LayoutDashboard, ArrowDownUp, Banknote, DollarSign, ArrowLeft } from 'lucide-react';
import PKRHeader from '@/components/PKRHeader';
import PKRFooter from '@/components/PKRFooter';

const ADMIN_ADDRESS = '0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F';

export default function V2AdminPage() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();

  // Redirect if not admin
  if (!isConnected || address?.toLowerCase() !== ADMIN_ADDRESS.toLowerCase()) {
    return <Navigate to="/pkrsc/v2/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/pkrsc/v2/dashboard')}
            className="mb-4 border-primary text-primary hover:bg-primary hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold mb-2">V2 Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage PKRSC V2 deposits, redemptions, and treasury
          </p>
        </div>

        <Tabs defaultValue="treasury" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="treasury" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Treasury</span>
            </TabsTrigger>
            <TabsTrigger value="deposits" className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4" />
              <span className="hidden sm:inline">Deposits</span>
            </TabsTrigger>
            <TabsTrigger value="redemptions" className="flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              <span className="hidden sm:inline">Redemptions</span>
            </TabsTrigger>
            <TabsTrigger value="fees" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Fees</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="treasury" className="space-y-6">
            <V2TreasuryDashboard />
          </TabsContent>

          <TabsContent value="deposits" className="space-y-6">
            <AdminV2Deposits />
          </TabsContent>

          <TabsContent value="redemptions" className="space-y-6">
            <AdminRedemptions />
          </TabsContent>

          <TabsContent value="fees" className="space-y-6">
            <TransactionFees />
          </TabsContent>
        </Tabs>
      </div>
      <PKRFooter />
    </div>
  );
}

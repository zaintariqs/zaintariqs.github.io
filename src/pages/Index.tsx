import { useAccount } from 'wagmi'
import { Navigate } from 'react-router-dom'
import PKRHeader from "@/components/PKRHeader";
import PKRHeroSection from "@/components/PKRHeroSection";
import PKRFeaturesSection from "@/components/PKRFeaturesSection";
import TransactionHistory from "@/components/TransactionHistory";
import PKRFooter from "@/components/PKRFooter";

const Index = () => {
  const { isConnected } = useAccount()

  // Redirect authenticated users to dashboard
  if (isConnected) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <main>
        <PKRHeroSection />
        <PKRFeaturesSection />
        <TransactionHistory />
      </main>
      <PKRFooter />
    </div>
  );
};

export default Index;

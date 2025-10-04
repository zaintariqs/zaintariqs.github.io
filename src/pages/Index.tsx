import { useAccount } from 'wagmi'
import { Navigate } from 'react-router-dom'
import PKRHeader from "@/components/PKRHeader";
import PKRHeroSection from "@/components/PKRHeroSection";
import PKRFeaturesSection from "@/components/PKRFeaturesSection";
import TransactionHistory from "@/components/TransactionHistory";
import PKRFooter from "@/components/PKRFooter";
import { WhitelistForm } from "@/components/WhitelistForm";

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
        
        {/* Whitelist Form Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Get Whitelisted</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                To access PKRSC services, you need to apply for whitelist approval. 
                Submit your wallet address and email, and our admin team will review your request.
              </p>
            </div>
            <WhitelistForm />
          </div>
        </section>

        <TransactionHistory />
      </main>
      <PKRFooter />
    </div>
  );
};

export default Index;

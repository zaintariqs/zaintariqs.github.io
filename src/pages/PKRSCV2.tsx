import PKRHeader from "@/components/PKRHeader";
import PKRFooter from "@/components/PKRFooter";
import { WalletConnect } from "@/components/WalletConnect";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Zap, Users } from "lucide-react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const PKRSCV2 = () => {
  const { isConnected } = useAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (isConnected) {
      navigate("/pkrsc/v2/dashboard");
    }
  }, [isConnected, navigate]);

  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Hero Section */}
          <div className="text-center space-y-6">
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-4">
              <span className="text-primary font-semibold">Version 2.0</span>
            </div>
            <h1 className="text-5xl font-bold text-white">
              PKRSC V2
            </h1>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Next generation Pakistani Rupee stablecoin with enhanced features and improved architecture
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <Shield className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Enhanced Security</h3>
              <p className="text-white/70">
                Advanced whitelist controls and improved access management
              </p>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <Zap className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Better Performance</h3>
              <p className="text-white/70">
                Optimized smart contracts for lower gas fees and faster transactions
              </p>
            </Card>

            <Card className="p-6 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Improved UX</h3>
              <p className="text-white/70">
                Streamlined user experience with modern interface design
              </p>
            </Card>
          </div>

          {/* What's New Section */}
          <Card className="p-8 bg-white/5 border-white/10">
            <h2 className="text-3xl font-bold text-white mb-6">What's New in V2</h2>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Whitelist-First Architecture</h4>
                  <p className="text-white/70">Default blocked addresses with explicit whitelist approval system</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Balancer Integration</h4>
                  <p className="text-white/70">Native support for Balancer managed pools with custom hooks</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div>
                  <h4 className="text-white font-semibold mb-1">Enhanced Monitoring</h4>
                  <p className="text-white/70">Real-time transaction monitoring and automated compliance checks</p>
                </div>
              </li>
            </ul>
          </Card>

          {/* CTA Section */}
          <div className="text-center space-y-6 pt-8">
            <h2 className="text-2xl font-bold text-white">Ready to Experience V2?</h2>
            <p className="text-white/70 mb-6">Connect your wallet to get started</p>
            <div className="flex justify-center">
              <WalletConnect />
            </div>
          </div>
        </div>
      </main>
      <PKRFooter />
    </div>
  );
};

export default PKRSCV2;

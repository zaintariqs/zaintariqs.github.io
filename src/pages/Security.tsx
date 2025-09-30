import PKRHeader from "@/components/PKRHeader";
import PKRFooter from "@/components/PKRFooter";
import { Shield, Lock, Database, Network, CheckCircle, Server } from "lucide-react";

const Security = () => {
  const securityFeatures = [
    {
      icon: Shield,
      title: "Non-Custodial Control",
      description: "You maintain complete control of your assets in your own wallet. We never hold, store, or have access to your funds."
    },
    {
      icon: Database,
      title: "Seamless Bridge Service",
      description: "We provide a secure bridge between crypto and cash, connecting you directly with regulated financial institutions without intermediaries."
    },
    {
      icon: Lock,
      title: "No KYC Required",
      description: "Since our partner financial institutions have already verified your identity, you don't need to go through KYC again with us."
    },
    {
      icon: Network,
      title: "Decentralized Infrastructure",
      description: "Built on battle-tested blockchain technology with no single point of failure, ensuring 24/7 availability and transparency."
    },
    {
      icon: Server,
      title: "Transparent Operations",
      description: "All bridge transactions are recorded on the blockchain, creating an immutable and auditable record of every conversion."
    },
    {
      icon: CheckCircle,
      title: "User Sovereignty",
      description: "Your keys, your crypto. We facilitate the connection but you remain in full control of your digital and fiat assets at all times."
    }
  ];

  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-crypto-dark via-crypto-dark to-crypto-gray/20" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
          
          <div className="container relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="flex justify-center mb-6">
                <div className="p-4 rounded-full bg-crypto-green/10 border border-crypto-green/20">
                  <Shield className="h-12 w-12 text-crypto-green" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Non-Custodial
                <span className="block bg-gradient-rainbow bg-clip-text text-transparent">
                  You Control Your Assets
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                PKR Stable never holds your assets. We provide a secure bridge between crypto and cash, 
                giving you complete control while connecting you to regulated financial institutions.
              </p>
            </div>
          </div>
        </section>

        {/* Security Features Grid */}
        <section className="py-20 bg-gradient-to-b from-transparent to-crypto-gray/10">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Your Assets, Your Control
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                We bridge crypto and cash without ever touching your funds. You stay in complete control.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {securityFeatures.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div key={index} className="group relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-crypto-green/5 to-green-400/5 rounded-xl blur-xl group-hover:blur-lg transition-all duration-300" />
                    <div className="relative bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6 group-hover:border-crypto-green/30 transition-all duration-300">
                      <div className="flex items-center justify-center w-12 h-12 bg-crypto-green/10 rounded-lg mb-4">
                        <Icon className="h-6 w-6 text-crypto-green" />
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                      <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Blockchain Architecture */}
        <section className="py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  How Our Bridge Works
                </h2>
                <p className="text-lg text-gray-400">
                  Understanding how PKR Stable connects your crypto to cash while keeping you in control
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-cyan/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Non-Custodial Design</h3>
                    <ul className="space-y-3 text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-cyan mr-3 flex-shrink-0" />
                        Your wallet, your keys - we never hold your assets
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-cyan mr-3 flex-shrink-0" />
                        Direct connection to regulated financial institutions
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-cyan mr-3 flex-shrink-0" />
                        Zero counterparty risk from our platform
                      </li>
                    </ul>
                  </div>

                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-purple/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Simplified Compliance</h3>
                    <ul className="space-y-3 text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-purple mr-3 flex-shrink-0" />
                        No additional KYC - institutions handle verification
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-purple mr-3 flex-shrink-0" />
                        Bridge to pre-verified banking partners
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-purple mr-3 flex-shrink-0" />
                        Transparent, auditable bridge transactions
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-rainbow/10 rounded-xl blur-2xl" />
                  <div className="relative bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-xl p-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-crypto/20 rounded-full mb-6">
                        <Network className="h-8 w-8 text-crypto-green" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">Bridge Architecture</h3>
                      <p className="text-gray-400 mb-6">
                        PKR Stable acts as a secure bridge, facilitating conversion between crypto and cash 
                        while you maintain full custody of your assets at all times.
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-crypto-dark/50 rounded-lg p-3">
                          <div className="text-crypto-cyan font-semibold">100%</div>
                          <div className="text-gray-400">Your Control</div>
                        </div>
                        <div className="bg-crypto-dark/50 rounded-lg p-3">
                          <div className="text-crypto-purple font-semibold">0%</div>
                          <div className="text-gray-400">We Hold</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <PKRFooter />
    </div>
  );
};

export default Security;
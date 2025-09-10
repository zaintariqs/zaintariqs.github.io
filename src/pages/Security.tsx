import PKRHeader from "@/components/PKRHeader";
import PKRFooter from "@/components/PKRFooter";
import { Shield, Lock, Database, Network, CheckCircle, Server } from "lucide-react";

const Security = () => {
  const securityFeatures = [
    {
      icon: Shield,
      title: "Military-Grade Encryption",
      description: "All transactions and data are protected with AES-256 encryption, the same standard used by financial institutions worldwide."
    },
    {
      icon: Database,
      title: "Immutable Blockchain Records",
      description: "Every PKR token issuance and transaction is permanently recorded on the blockchain, creating an unchangeable audit trail."
    },
    {
      icon: Lock,
      title: "Multi-Signature Security",
      description: "Reserve funds are secured with multi-signature wallets requiring multiple authorized parties for any transaction."
    },
    {
      icon: Network,
      title: "Decentralized Infrastructure",
      description: "Built on battle-tested blockchain technology with no single point of failure, ensuring 24/7 availability."
    },
    {
      icon: Server,
      title: "Real-Time Auditing",
      description: "Smart contracts enable continuous monitoring and verification of PKR reserves backing every token in circulation."
    },
    {
      icon: CheckCircle,
      title: "Regulatory Compliance",
      description: "Designed to meet Pakistani financial regulations and international cryptocurrency compliance standards."
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
                Bank-Grade
                <span className="block bg-gradient-to-r from-crypto-green to-green-400 bg-clip-text text-transparent">
                  Security Architecture
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                PKR Stable is built on enterprise-grade blockchain infrastructure with multiple layers of security 
                to protect your digital assets and ensure the integrity of every transaction.
              </p>
            </div>
          </div>
        </section>

        {/* Security Features Grid */}
        <section className="py-20 bg-gradient-to-b from-transparent to-crypto-gray/10">
          <div className="container">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Multi-Layer Security Framework
              </h2>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Our security architecture combines proven blockchain technology with advanced cryptographic methods
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
                  Blockchain Architecture
                </h2>
                <p className="text-lg text-gray-400">
                  Understanding the technical foundation that makes PKR Stable secure and reliable
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Smart Contract Security</h3>
                    <ul className="space-y-3 text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-green mr-3 flex-shrink-0" />
                        Audited smart contracts with no backdoors
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-green mr-3 flex-shrink-0" />
                        Automated reserve verification mechanisms
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-green mr-3 flex-shrink-0" />
                        Time-locked upgrades for transparency
                      </li>
                    </ul>
                  </div>

                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Reserve Management</h3>
                    <ul className="space-y-3 text-gray-400">
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-green mr-3 flex-shrink-0" />
                        100% Pakistani Rupee backing in regulated banks
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-green mr-3 flex-shrink-0" />
                        Real-time attestations of reserve holdings
                      </li>
                      <li className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-crypto-green mr-3 flex-shrink-0" />
                        Multi-signature custody solutions
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-crypto-green/10 to-green-400/10 rounded-xl blur-2xl" />
                  <div className="relative bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-xl p-8">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-crypto-green/10 rounded-full mb-6">
                        <Network className="h-8 w-8 text-crypto-green" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-4">Decentralized Network</h3>
                      <p className="text-gray-400 mb-6">
                        PKR Stable operates on a distributed network of validators, ensuring no single entity 
                        can compromise the system integrity.
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="bg-crypto-dark/50 rounded-lg p-3">
                          <div className="text-crypto-green font-semibold">99.9%</div>
                          <div className="text-gray-400">Uptime</div>
                        </div>
                        <div className="bg-crypto-dark/50 rounded-lg p-3">
                          <div className="text-crypto-green font-semibold">24/7</div>
                          <div className="text-gray-400">Monitoring</div>
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
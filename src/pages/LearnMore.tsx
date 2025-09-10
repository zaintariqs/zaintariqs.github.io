import PKRHeader from "@/components/PKRHeader";
import PKRFooter from "@/components/PKRFooter";
import { Button } from "@/components/ui/button";
import { FileText, Clock, Bell, MessageCircle, Download, Eye } from "lucide-react";

const LearnMore = () => {
  const handleWhatsAppContact = () => {
    window.open("https://wa.me/905314390365", "_blank");
  };

  const handleNotifyMe = () => {
    // This would typically integrate with an email service
    alert("We'll notify you when the whitepaper is published!");
  };

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
                  <FileText className="h-12 w-12 text-crypto-green" />
                </div>
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Technical
                <span className="block bg-gradient-to-r from-crypto-green to-green-400 bg-clip-text text-transparent">
                  Documentation
                </span>
              </h1>
              <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
                Comprehensive technical documentation and whitepaper for PKR Stable will be available soon for public review and audit.
              </p>
            </div>
          </div>
        </section>

        {/* Whitepaper Status */}
        <section className="py-20">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-crypto-green/5 to-green-400/5 rounded-2xl blur-xl" />
                <div className="relative bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 md:p-12">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-crypto-green/10 rounded-full mb-8">
                      <Clock className="h-10 w-10 text-crypto-green" />
                    </div>
                    
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                      Whitepaper Coming Soon
                    </h2>
                    
                    <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
                      Our comprehensive technical whitepaper is currently under final review and will be published soon 
                      for public audit. The document will include detailed information about our tokenomics, security architecture, 
                      regulatory compliance, and technical implementation.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                      <div className="bg-crypto-dark/50 rounded-xl p-6">
                        <FileText className="h-8 w-8 text-crypto-green mb-4 mx-auto" />
                        <h3 className="text-lg font-semibold text-white mb-2">Technical Specs</h3>
                        <p className="text-gray-400 text-sm">
                          Detailed blockchain architecture and smart contract documentation
                        </p>
                      </div>
                      
                      <div className="bg-crypto-dark/50 rounded-xl p-6">
                        <Eye className="h-8 w-8 text-crypto-green mb-4 mx-auto" />
                        <h3 className="text-lg font-semibold text-white mb-2">Transparency</h3>
                        <p className="text-gray-400 text-sm">
                          Open-source code and public audit results for complete transparency
                        </p>
                      </div>
                      
                      <div className="bg-crypto-dark/50 rounded-xl p-6">
                        <Download className="h-8 w-8 text-crypto-green mb-4 mx-auto" />
                        <h3 className="text-lg font-semibold text-white mb-2">Public Access</h3>
                        <p className="text-gray-400 text-sm">
                          Free download and distribution for community review and feedback
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button 
                        onClick={handleNotifyMe}
                        size="lg"
                        className="bg-crypto-green hover:bg-crypto-green/90 text-white px-8 py-4 text-lg font-semibold"
                      >
                        <Bell className="h-5 w-5 mr-2" />
                        Notify Me When Published
                      </Button>
                      
                      <Button 
                        onClick={handleWhatsAppContact}
                        variant="outline"
                        size="lg"
                        className="border-crypto-green/30 text-crypto-green hover:bg-crypto-green/10 px-8 py-4 text-lg font-semibold"
                      >
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Ask Questions
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What to Expect */}
        <section className="py-20 bg-gradient-to-b from-transparent to-crypto-gray/10">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  What to Expect in Our Whitepaper
                </h2>
                <p className="text-lg text-gray-400">
                  Comprehensive documentation covering all aspects of PKR Stable
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Technical Architecture</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li>• Blockchain infrastructure details</li>
                      <li>• Smart contract specifications</li>
                      <li>• Security protocols and audits</li>
                      <li>• Integration APIs and SDKs</li>
                    </ul>
                  </div>

                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Tokenomics</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li>• Token supply mechanics</li>
                      <li>• Minting and burning processes</li>
                      <li>• Reserve management strategy</li>
                      <li>• Stability mechanisms</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Regulatory Compliance</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li>• Pakistani financial regulations</li>
                      <li>• International compliance standards</li>
                      <li>• KYC/AML procedures</li>
                      <li>• Regulatory partnerships</li>
                    </ul>
                  </div>

                  <div className="bg-crypto-gray/20 backdrop-blur-sm border border-crypto-green/10 rounded-xl p-6">
                    <h3 className="text-xl font-semibold text-white mb-4">Use Cases & Adoption</h3>
                    <ul className="space-y-2 text-gray-400">
                      <li>• Payment system integration</li>
                      <li>• Cross-border transactions</li>
                      <li>• Merchant adoption strategy</li>
                      <li>• Partnership ecosystem</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-20">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold text-white mb-4">
                Have Questions?
              </h2>
              <p className="text-lg text-gray-300 mb-8">
                Contact our team directly for more information about PKR Stable and early access opportunities.
              </p>
              <Button 
                onClick={handleWhatsAppContact}
                size="lg"
                className="bg-crypto-green hover:bg-crypto-green/90 text-white px-8 py-4 text-lg font-semibold"
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Contact Us on WhatsApp
              </Button>
            </div>
          </div>
        </section>
      </main>
      <PKRFooter />
    </div>
  );
};

export default LearnMore;
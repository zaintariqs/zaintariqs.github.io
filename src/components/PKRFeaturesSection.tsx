import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Zap, Users, Eye, MessageCircle } from "lucide-react";

const PKRFeaturesSection = () => {
  const handleWhatsAppContact = () => {
    window.open("https://wa.me/905314390365", "_blank");
  };

  const features = [
    {
      icon: Shield,
      title: "Bank-Grade Security",
      description: "Multi-signature wallets, cold storage, and institutional-grade security protocols protect your funds."
    },
    {
      icon: TrendingUp,
      title: "Price Stability",
      description: "Always worth exactly 1 PKR. No volatility, no surprises - just stable digital currency."
    },
    {
      icon: Zap,
      title: "Instant Transfers",
      description: "Send and receive payments instantly, 24/7, anywhere in Pakistan or globally."
    },
    {
      icon: Eye,
      title: "Full Transparency",
      description: "Real-time reserve audits and transparent reporting. Every PKR is backed by real reserves."
    },
    {
      icon: Users,
      title: "Mass Adoption Ready",
      description: "Designed for businesses, individuals, and institutions. Scale from personal use to enterprise."
    },
    {
      icon: MessageCircle,
      title: "Local Support",
      description: "Pakistani team providing 24/7 support in Urdu and English via WhatsApp and other channels."
    }
  ];

  return (
    <section id="features" className="py-20 bg-crypto-dark">
      <div className="container px-4">
        {/* Money to Digital Animation */}
        <div className="relative mb-16 overflow-hidden h-40">
          <div className="absolute inset-0 pointer-events-none">
            {/* Money Bills Animation */}
            <div className="absolute top-1/4 left-1/4 animate-bounce">
              <div className="money-bill transform rotate-12 animate-pulse">
                <span className="text-2xl text-crypto-green opacity-80">₨</span>
              </div>
            </div>
            <div className="absolute top-1/3 right-1/4 animate-bounce delay-1000">
              <div className="money-bill transform -rotate-6 animate-pulse">
                <span className="text-xl text-crypto-green opacity-60">₨</span>
              </div>
            </div>
            <div className="absolute bottom-1/4 left-1/3 animate-bounce delay-2000">
              <div className="money-bill transform rotate-45 animate-pulse">
                <span className="text-lg text-crypto-green opacity-70">₨</span>
              </div>
            </div>
            
            {/* Digital Transformation Trail */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="digital-particles">
                <div className="particle animate-ping delay-500">1</div>
                <div className="particle animate-ping delay-700">0</div>
                <div className="particle animate-ping delay-900">1</div>
                <div className="particle animate-ping delay-1100">0</div>
                <div className="particle animate-ping delay-1300">1</div>
              </div>
            </div>
            
            {/* Digital Bytes Flow */}
            <div className="absolute top-1/4 right-1/3 digital-flow">
              <div className="flow-line animate-pulse">
                <span className="text-crypto-green text-xs opacity-50">01101000</span>
              </div>
            </div>
            <div className="absolute bottom-1/4 left-1/3 digital-flow delay-1000">
              <div className="flow-line animate-pulse">
                <span className="text-crypto-green text-xs opacity-50">11010011</span>
              </div>
            </div>
            
            {/* Transformation Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="transformation-center">
                <div className="w-16 h-16 border-2 border-crypto-green/30 rounded-full animate-spin">
                  <div className="w-12 h-12 border border-crypto-green/50 rounded-full m-1 animate-pulse">
                    <div className="w-8 h-8 bg-gradient-to-r from-crypto-green/20 to-transparent rounded-full m-1 animate-bounce">
                      <div className="flex items-center justify-center w-full h-full">
                        <span className="text-crypto-green text-xs font-bold">₨→01</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Why Choose PKR Stable?
          </h2>
          <p className="text-xl text-gray-300">
            Built specifically for the Pakistani market with local needs, regulations, and preferences in mind.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-crypto-gray/20 border border-crypto-gray/30 rounded-xl p-6 hover:border-crypto-green/30 transition-colors"
            >
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-crypto-green/10">
                  <feature.icon className="h-6 w-6 text-crypto-green" />
                </div>
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
              </div>
              <p className="text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-crypto-green/10 to-crypto-green/5 border border-crypto-green/20 rounded-2xl p-8">
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            Join the future of Pakistani digital payments. Contact us on WhatsApp to learn more about PKR Stable and how to get started.
          </p>
          <Button 
            size="lg"
            onClick={handleWhatsAppContact}
            className="bg-crypto-green hover:bg-crypto-green/90 text-white px-8 py-4 text-lg font-semibold"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            Contact Us on WhatsApp
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PKRFeaturesSection;
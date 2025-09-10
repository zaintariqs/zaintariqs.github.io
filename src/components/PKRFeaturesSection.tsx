import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Zap, Users, Eye, MessageCircle } from "lucide-react";

const PKRFeaturesSection = () => {
  const handleWhatsAppContact = () => {
    window.open("https://wa.me/+905314390365", "_Welcome to the future ");
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
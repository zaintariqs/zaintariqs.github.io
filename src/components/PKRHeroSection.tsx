import { Button } from "@/components/ui/button";
import { MessageCircle, Shield, TrendingUp, Zap } from "lucide-react";

const PKRHeroSection = () => {
  const handleWhatsAppContact = () => {
    window.open("https://wa.me/+905324390365", "_blank");
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-crypto-dark via-crypto-dark to-crypto-dark/95">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(34,197,94,0.05)_50%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-4 py-20">
        <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
          {/* Main Heading */}
          <div className="space-y-4">
            <div className="inline-flex items-center px-4 py-2 bg-crypto-green/10 border border-crypto-green/20 rounded-full">
              <span className="text-crypto-green text-sm font-medium">Pakistan's First PKR-Backed Stablecoin</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
              Stable. Secure.
              <span className="block bg-gradient-to-r from-crypto-green to-crypto-green/80 bg-clip-text text-transparent">
                Pakistani.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              The future of digital payments in Pakistan. 1:1 PKR-backed stablecoin with full transparency and regulatory compliance.
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-2xl">
            <div className="text-center">
              <div className="text-3xl font-bold text-crypto-green">1:1</div>
              <div className="text-gray-400 text-sm">PKR Backed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-crypto-green">100%</div>
              <div className="text-gray-400 text-sm">Transparent</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-crypto-green">24/7</div>
              <div className="text-gray-400 text-sm">Available</div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              size="lg"
              onClick={handleWhatsAppContact}
              className="bg-crypto-green hover:bg-crypto-green/90 text-white px-8 py-4 text-lg font-semibold"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Get Started on WhatsApp
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-crypto-green text-crypto-green hover:bg-crypto-green/10 px-8 py-4 text-lg font-semibold"
            >
              Learn More
            </Button>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-3xl">
            <div className="flex items-center space-x-3 text-gray-300">
              <Shield className="h-6 w-6 text-crypto-green" />
              <span>Bank-Grade Security</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <TrendingUp className="h-6 w-6 text-crypto-green" />
              <span>Stable Value</span>
            </div>
            <div className="flex items-center space-x-3 text-gray-300">
              <Zap className="h-6 w-6 text-crypto-green" />
              <span>Instant Transfers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-2 h-2 bg-crypto-green rounded-full animate-pulse opacity-60" />
      <div className="absolute top-40 right-16 w-1 h-1 bg-crypto-green rounded-full animate-pulse opacity-40" />
      <div className="absolute bottom-32 left-1/4 w-1.5 h-1.5 bg-crypto-green rounded-full animate-pulse opacity-50" />
      <div className="absolute bottom-48 right-1/3 w-1 h-1 bg-crypto-green rounded-full animate-pulse opacity-60" />
    </section>
  );
};

export default PKRHeroSection;
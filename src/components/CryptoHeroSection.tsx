import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, TrendingUp, Shield, Wheat } from "lucide-react";
import cryptoHeroBg from "@/assets/crypto-hero-bg.jpg";
import croptoLogo from "@/assets/cropto-logo.png";

const exchanges = [
  { name: "Bitlo", url: "#", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=50&fit=crop" },
  { name: "CoinTR | CROW", url: "#", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=50&fit=crop" },
  { name: "CoinTR | CROF", url: "#", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=50&fit=crop" },
  { name: "P2B", url: "#", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=50&fit=crop" },
  { name: "FameEX", url: "#", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=50&fit=crop" },
  { name: "CoinStore", url: "#", logo: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=100&h=50&fit=crop" }
];

const CryptoHeroSection = () => {
  return (
    <section className="relative min-h-screen overflow-hidden bg-crypto-dark">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${cryptoHeroBg})` }}
      />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-hero" />
      
      {/* Animated Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,black_40%,transparent_100%)]" />

      <div className="container relative py-20 lg:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="space-y-8 text-white">
            <div className="space-y-6">
              <Badge variant="secondary" className="bg-crypto-green/20 text-crypto-green border-crypto-green/30">
                <Wheat className="h-3 w-3 mr-1" />
                The World's unique Agricultural RWA Token Family
              </Badge>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-crypto-green">Cropto</span> is an unique and
                <span className="block">reliable way to invest in</span>
                <span className="block text-crypto-green">agricultural commodities</span>
              </h1>
              
              <p className="text-xl text-gray-300 max-w-lg leading-relaxed">
                The first agricultural product-backed tokens in the world, spanning from Europe and Asia, 
                provide an unique and reliable way to invest in agriculture with products securely and 
                transparently stored in audited warehouses.
              </p>
            </div>

            {/* Exchange Buttons */}
            <div className="space-y-4">
              <p className="text-lg font-semibold text-gray-200">
                Invest in Cropto today with the following Exchanges.
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {exchanges.map((exchange, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="bg-crypto-gray/50 border-crypto-gray hover:bg-crypto-green/20 hover:border-crypto-green text-white justify-start"
                    asChild
                  >
                    <a href={exchange.url} target="_blank" rel="noopener noreferrer">
                      <span className="truncate">{exchange.name}</span>
                      <ExternalLink className="h-3 w-3 ml-2 flex-shrink-0" />
                    </a>
                  </Button>
                ))}
              </div>
              
              <Button 
                size="lg" 
                className="bg-gradient-crypto hover:opacity-90 text-white shadow-crypto"
              >
                Buy on CroptoDEX Beta Version
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center">
                <div className="text-2xl font-bold text-crypto-green">$50M+</div>
                <div className="text-sm text-gray-400">Market Cap</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-crypto-green">15k+</div>
                <div className="text-sm text-gray-400">Token Holders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-crypto-green">99.9%</div>
                <div className="text-sm text-gray-400">Uptime</div>
              </div>
            </div>
          </div>

          {/* Token Visual */}
          <div className="relative flex items-center justify-center">
            <div className="relative">
              {/* Glowing Circle */}
              <div className="absolute inset-0 rounded-full bg-gradient-crypto blur-2xl opacity-50 scale-150 animate-pulse" />
              
              {/* Token Circle */}
              <div className="relative w-80 h-80 rounded-full bg-gradient-crypto flex items-center justify-center shadow-glow">
                <div className="w-72 h-72 rounded-full bg-crypto-dark/80 flex items-center justify-center border-2 border-crypto-green/50">
                  <div className="text-center space-y-4">
                    <img src={croptoLogo} alt="Cropto Logo" className="w-24 h-24 mx-auto" />
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-white">CROPTO</div>
                      <div className="text-sm text-crypto-green">Agricultural RWA Token</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute top-0 right-0 bg-crypto-dark/90 backdrop-blur-sm rounded-lg p-3 border border-crypto-green/30">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-crypto-green" />
                  <div className="text-white text-sm font-medium">+24.5%</div>
                </div>
              </div>

              <div className="absolute bottom-4 left-0 bg-crypto-dark/90 backdrop-blur-sm rounded-lg p-3 border border-crypto-green/30">
                <div className="flex items-center space-x-2">
                  <Shield className="h-4 w-4 text-crypto-green" />
                  <div className="text-white text-sm font-medium">Audited</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CryptoHeroSection;
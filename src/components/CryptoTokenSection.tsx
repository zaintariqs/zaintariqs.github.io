import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Coins, 
  TrendingUp, 
  Shield, 
  BarChart3, 
  ExternalLink,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

const tokens = [
  {
    symbol: "CROW",
    name: "Cropto Wheat",
    price: "$2.45",
    change: "+12.5%",
    positive: true,
    volume: "$2.4M",
    marketCap: "$24.5M",
    commodity: "Wheat",
    location: "Europe"
  },
  {
    symbol: "CROF",
    name: "Cropto Fruit",
    price: "$1.87",
    change: "-3.2%",
    positive: false,
    volume: "$1.8M",
    marketCap: "$18.7M",
    commodity: "Fruits",
    location: "Asia"
  },
  {
    symbol: "CROV",
    name: "Cropto Vegetables",
    price: "$3.12",
    change: "+8.7%",
    positive: true,
    volume: "$3.1M",
    marketCap: "$31.2M",
    commodity: "Vegetables",
    location: "Europe"
  },
  {
    symbol: "CROS",
    name: "Cropto Spices",
    price: "$4.95",
    change: "+15.3%",
    positive: true,
    volume: "$1.2M",
    marketCap: "$12.8M",
    commodity: "Spices",
    location: "Asia"
  }
];

const features = [
  {
    icon: Shield,
    title: "Audited Warehouses",
    description: "All agricultural products are stored in verified and audited warehouses with real-time monitoring."
  },
  {
    icon: BarChart3,
    title: "Real-Time Pricing",
    description: "Dynamic pricing based on actual commodity markets and supply chain data."
  },
  {
    icon: Coins,
    title: "Tokenized Assets",
    description: "Each token represents real agricultural commodities with transparent backing."
  },
  {
    icon: TrendingUp,
    title: "Market Analytics",
    description: "Advanced analytics and insights for agricultural commodity investments."
  }
];

const CryptoTokenSection = () => {
  return (
    <section className="py-20 bg-crypto-dark">
      <div className="container space-y-16">
        {/* Token Family Header */}
        <div className="text-center space-y-6">
          <Badge variant="secondary" className="bg-crypto-green/20 text-crypto-green border-crypto-green/30">
            Cropto Token Family
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Agricultural RWA Tokens
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Diversified portfolio of agricultural commodity-backed tokens spanning multiple regions and product categories.
          </p>
        </div>

        {/* Token Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tokens.map((token, index) => (
            <Card key={index} className="bg-crypto-gray/50 border-crypto-gray hover:border-crypto-green/50 transition-all duration-300 hover:shadow-crypto">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-crypto flex items-center justify-center text-white font-bold text-sm">
                      {token.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <CardTitle className="text-white text-sm">{token.symbol}</CardTitle>
                      <p className="text-gray-400 text-xs">{token.name}</p>
                    </div>
                  </div>
                  <Badge variant={token.positive ? "default" : "destructive"} className="text-xs">
                    {token.location}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-white">{token.price}</span>
                    <div className={`flex items-center space-x-1 ${token.positive ? 'text-crypto-green' : 'text-red-400'}`}>
                      {token.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      <span className="text-sm font-medium">{token.change}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Volume</span>
                      <div className="text-white font-medium">{token.volume}</div>
                    </div>
                    <div>
                      <span className="text-gray-400">Market Cap</span>
                      <div className="text-white font-medium">{token.marketCap}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-crypto-gray">
                    <span className="text-xs text-gray-400">Commodity</span>
                    <div className="text-white font-medium">{token.commodity}</div>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full bg-crypto-green/20 hover:bg-crypto-green text-crypto-green hover:text-white border border-crypto-green/30"
                >
                  Trade {token.symbol}
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Features Grid */}
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Why Choose Cropto Tokens?
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Revolutionary blockchain technology meets traditional agriculture for transparent and secure investments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-crypto-gray/30 border-crypto-gray hover:border-crypto-green/50 transition-all duration-300 group">
                <CardContent className="p-6 space-y-4 text-center">
                  <div className="mx-auto h-12 w-12 rounded-lg bg-gradient-crypto flex items-center justify-center group-hover:shadow-crypto transition-all">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 bg-gradient-crypto rounded-2xl p-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Start Investing in Agricultural RWA Today
          </h2>
          <p className="text-xl text-green-100 max-w-2xl mx-auto">
            Join the future of agricultural investment with blockchain-backed commodity tokens.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-crypto-green hover:bg-gray-100">
              View All Tokens
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              Read Whitepaper
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CryptoTokenSection;
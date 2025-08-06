import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Handshake, 
  DollarSign, 
  Truck, 
  Shield, 
  MessageCircle, 
  BarChart3,
  Users,
  Globe
} from "lucide-react";
import { Link } from "react-router-dom";

const features = [
  {
    icon: Handshake,
    title: "Direct Connection",
    description: "Connect farmers and buyers without intermediaries for better relationships and transparency.",
    color: "text-blue-600"
  },
  {
    icon: DollarSign,
    title: "Fair Pricing",
    description: "Farmers get better prices for their produce while buyers save on markup costs.",
    color: "text-green-600"
  },
  {
    icon: Truck,
    title: "Flexible Delivery",
    description: "Coordinate pickup or delivery directly with farmers based on your needs.",
    color: "text-orange-600"
  },
  {
    icon: Shield,
    title: "Quality Assurance",
    description: "Verified farmers with quality ratings and reviews from previous buyers.",
    color: "text-purple-600"
  },
  {
    icon: MessageCircle,
    title: "Direct Communication",
    description: "Chat directly with farmers to discuss products, quantities, and special requests.",
    color: "text-pink-600"
  },
  {
    icon: BarChart3,
    title: "Market Insights",
    description: "Access real-time pricing data and market trends to make informed decisions.",
    color: "text-indigo-600"
  }
];

const stats = [
  {
    icon: Users,
    value: "500+",
    label: "Registered Farmers",
    description: "Growing network of verified agricultural producers"
  },
  {
    icon: Globe,
    value: "50+",
    label: "Cities Covered",
    description: "Expanding reach across multiple regions"
  },
  {
    icon: DollarSign,
    value: "$2M+",
    label: "Trade Volume",
    description: "Total value of transactions facilitated"
  },
  {
    icon: Handshake,
    value: "15k+",
    label: "Successful Deals",
    description: "Completed transactions between farmers and buyers"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-24 bg-gradient-card">
      <div className="container space-y-20">
        {/* Features Grid */}
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <Badge variant="secondary" className="mb-4">
              Why Choose FarmDirect
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold">
              Revolutionizing Agricultural Trade
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our platform eliminates inefficiencies in the agricultural supply chain, 
              creating win-win scenarios for both farmers and buyers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-medium transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 space-y-4">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center ${feature.color}`}>
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats Section */}
        <div className="space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Growing Impact
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of farmers and buyers who are already benefiting from direct trade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center space-y-4 p-6">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-primary flex items-center justify-center">
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-lg font-semibold">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 bg-primary rounded-2xl p-12 text-white">
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-green-100 max-w-2xl mx-auto">
            Join our platform today and experience the benefits of direct agricultural trade.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-primary hover:bg-white/90" asChild>
              <Link to="/farmer-signup">
                I'm a Farmer
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10" asChild>
              <Link to="/buyer-signup">
                I'm a Buyer
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
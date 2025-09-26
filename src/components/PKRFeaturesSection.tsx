import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Zap, Users, Eye, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRFeaturesSection = () => {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/905314390365", "_blank");
  };

  const features = [
    {
      icon: Shield,
      title: t.feature1.title,
      description: t.feature1.description
    },
    {
      icon: TrendingUp,
      title: t.feature2.title,
      description: t.feature2.description
    },
    {
      icon: Zap,
      title: t.feature3.title,
      description: t.feature3.description
    },
    {
      icon: Eye,
      title: t.feature4.title,
      description: t.feature4.description
    },
    {
      icon: Users,
      title: t.feature5.title,
      description: t.feature5.description
    },
    {
      icon: MessageCircle,
      title: t.feature6.title,
      description: t.feature6.description
    }
  ];

  return (
    <section id="features" className="py-20 bg-crypto-dark">
      <div className="container px-4">
        <div className={`text-center max-w-3xl mx-auto mb-16 ${isUrdu ? 'font-urdu text-right' : ''}`}>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            {t.featuresTitle}
          </h2>
          <p className="text-xl text-gray-300">
            {t.featuresSubtitle}
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
                <h3 className={`text-xl font-semibold text-white ${isUrdu ? 'text-right' : ''}`}>{feature.title}</h3>
              </div>
              <p className={`text-gray-300 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>{feature.description}</p>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className={`text-center bg-gradient-to-r from-crypto-green/10 to-crypto-green/5 border border-crypto-green/20 rounded-2xl p-8 ${isUrdu ? 'text-right' : ''}`}>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
            {t.ctaTitle}
          </h3>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            {t.ctaSubtitle}
          </p>
          <Button 
            size="lg"
            onClick={handleWhatsAppContact}
            className="bg-crypto-green hover:bg-crypto-green/90 text-white px-8 py-4 text-lg font-semibold"
          >
            <MessageCircle className="h-5 w-5 mr-2" />
            {isUrdu ? "واٹس ایپ پر رابطہ کریں" : "Contact Us on WhatsApp"}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PKRFeaturesSection;
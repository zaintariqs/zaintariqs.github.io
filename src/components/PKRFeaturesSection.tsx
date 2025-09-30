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
              className="group relative bg-gradient-to-br from-crypto-gray/30 to-crypto-gray/10 border border-crypto-gray/30 rounded-2xl p-8 hover:border-crypto-green/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(34,197,94,0.3)]"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
              <div className="relative">
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-xl bg-crypto-green/10 group-hover:bg-crypto-green/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                  <feature.icon className="h-8 w-8 text-crypto-green" />
                </div>
                <h3 className={`text-xl font-bold text-white mb-3 group-hover:text-crypto-green-light transition-colors duration-300 ${isUrdu ? 'text-right' : ''}`}>
                  {feature.title}
                </h3>
                <p className={`text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300 ${isUrdu ? 'text-right' : ''}`}>
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Section */}
        <div className={`relative overflow-hidden text-center bg-gradient-to-r from-crypto-green/10 via-crypto-green/15 to-crypto-green/10 border border-crypto-green/30 rounded-3xl p-12 ${isUrdu ? 'text-right' : ''}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,197,94,0.15),transparent_70%)]" />
          <div className="relative z-10">
            <h3 className="text-3xl md:text-4xl font-extrabold text-white mb-4 bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              {t.ctaTitle}
            </h3>
            <p className="text-lg text-gray-200 mb-8 max-w-2xl mx-auto leading-relaxed">
              {t.ctaSubtitle}
            </p>
            <Button 
              size="lg"
              onClick={handleWhatsAppContact}
              className="group bg-crypto-green hover:bg-crypto-green-light text-white px-10 py-6 text-lg font-bold rounded-xl shadow-glow hover:shadow-[0_0_60px_rgba(34,197,94,0.4)] hover:scale-105 transition-all duration-300"
            >
              <MessageCircle className="h-6 w-6 mr-2 group-hover:rotate-12 transition-transform duration-300" />
              {isUrdu ? "واٹس ایپ پر رابطہ کریں" : "Contact Us on WhatsApp"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PKRFeaturesSection;
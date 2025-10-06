import { Shield, TrendingUp, Zap, Users, Eye, MessageCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRFeaturesSection = () => {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

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
    <section id="features" className="py-24 bg-gradient-to-b from-crypto-dark to-[hsl(222,47%,13%)]">
      <div className="container px-4">
        <div className={`text-center max-w-3xl mx-auto mb-20 ${isUrdu ? 'font-urdu text-right' : ''}`}>
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            {t.featuresTitle}
          </h2>
          <p className="text-lg text-gray-400 font-light">
            {t.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group relative bg-gradient-card backdrop-blur-md border border-white/5 rounded-2xl p-8 hover:border-crypto-green/20 transition-all duration-500 hover:shadow-elegant"
            >
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-crypto-green/10 group-hover:bg-crypto-green/15 transition-colors">
                <feature.icon className="h-7 w-7 text-crypto-green" />
              </div>
              <h3 className={`text-lg font-semibold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
                {feature.title}
              </h3>
              <p className={`text-sm text-gray-400 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default PKRFeaturesSection;
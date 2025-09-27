import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRHeroSection = () => {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-crypto-dark via-crypto-dark to-crypto-dark/95">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,197,94,0.1),transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(34,197,94,0.05)_50%,transparent_100%)]" />
      </div>

      <div className="container relative z-10 px-4 py-20">
        <div className={`flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto ${isUrdu ? 'font-urdu' : ''}`}>
          {/* Main Heading */}
          <div className="space-y-4">
            <div className="inline-flex items-center px-4 py-2 bg-crypto-green/10 border border-crypto-green/20 rounded-full">
              <span className="text-crypto-green text-sm font-medium">
                {isUrdu ? "پاکستان کا پہلا PKR سے محفوظ سٹیبل کوائن" : "Pakistan's First PKR-Backed Stablecoin"}
              </span>
            </div>
            
            <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight ${isUrdu ? 'text-right' : ''}`}>
              {isUrdu ? (
                <>
                  محفوظ۔ مستحکم۔
                  <span className="block bg-gradient-to-r from-crypto-green to-crypto-green/80 bg-clip-text text-transparent">
                    پاکستانی۔
                  </span>
                </>
              ) : (
                <>
                  Stable. Secure.
                  <span className="block bg-gradient-to-r from-crypto-green to-crypto-green/80 bg-clip-text text-transparent">
                    Pakistani.
                  </span>
                </>
              )}
            </h1>
            
            <p className={`text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
              {t.heroSubtitle}
            </p>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-2xl">
            <div className={`text-center ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-3xl font-bold text-crypto-green">1:1</div>
              <div className="text-gray-400 text-sm">
                {isUrdu ? "PKR محفوظ" : "PKR Backed"}
              </div>
            </div>
            <div className={`text-center ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-3xl font-bold text-crypto-green">100%</div>
              <div className="text-gray-400 text-sm">
                {isUrdu ? "شفاف" : "Transparent"}
              </div>
            </div>
            <div className={`text-center ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-3xl font-bold text-crypto-green">24/7</div>
              <div className="text-gray-400 text-sm">
                {isUrdu ? "دستیاب" : "Available"}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 ${isUrdu ? 'sm:flex-row-reverse' : ''}`}>
            <Button 
              size="lg"
              variant="outline"
              className="border-crypto-green text-crypto-green hover:bg-crypto-green/10 px-8 py-4 text-lg font-semibold"
              asChild
            >
              <Link to="/learn-more">{t.learnMore}</Link>
            </Button>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 w-full max-w-4xl">
            <div className="bg-crypto-gray/10 backdrop-blur-sm border border-crypto-green/20 rounded-xl p-6 text-center hover:border-crypto-green/40 transition-all duration-300">
              <Shield className="h-8 w-8 text-crypto-green mx-auto mb-3" />
              <h3 className={`text-lg font-semibold text-white mb-2 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "بینک گریڈ سیکورٹی" : "Bank-Grade Security"}
              </h3>
              <p className={`text-sm text-gray-400 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu 
                  ? "ملٹی سگنیچر والیٹس اور ادارہ جاتی گریڈ انکرپشن آپ کے ڈیجیٹل اثاثوں کو بڑے مالیاتی اداروں کے معیار کے ساتھ محفوظ رکھتا ہے۔"
                  : "Multi-signature wallets and institutional-grade encryption protect your digital assets with the same standards used by major financial institutions."
                }
              </p>
            </div>
            <div className="bg-crypto-gray/10 backdrop-blur-sm border border-crypto-green/20 rounded-xl p-6 text-center hover:border-crypto-green/40 transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-crypto-green mx-auto mb-3" />
              <h3 className={`text-lg font-semibold text-white mb-2 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "مستحکم قدر" : "Stable Value"}
              </h3>
              <p className={`text-sm text-gray-400 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu
                  ? "ہمیشہ حقیقی PKR ریزرو کے ساتھ پاکستانی روپے کے ساتھ 1:1 کی نسبت۔ کوئی تبدیلی نہیں، صرف قابل اعتماد ڈیجیٹل کرنسی۔"
                  : "Always pegged 1:1 to Pakistani Rupee with real PKR reserves backing every token. No volatility, just reliable digital currency you can trust."
                }
              </p>
            </div>
            <div className="bg-crypto-gray/10 backdrop-blur-sm border border-crypto-green/20 rounded-xl p-6 text-center hover:border-crypto-green/40 transition-all duration-300">
              <Zap className="h-8 w-8 text-crypto-green mx-auto mb-3" />
              <h3 className={`text-lg font-semibold text-white mb-2 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "فوری ٹرانسفر" : "Instant Transfers"}
              </h3>
              <p className={`text-sm text-gray-400 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu
                  ? "PKR سٹیبل کو فوری طور پر بھیجیں اور وصول کریں، 24/7، پاکستان میں کہیں بھی یا عالمی سطح پر۔ کوئی انتظار نہیں، کوئی بینک چھٹیاں نہیں۔"
                  : "Send and receive PKR Stable instantly, 24/7, anywhere in Pakistan or globally. No waiting periods, no bank holidays, just fast payments."
                }
              </p>
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
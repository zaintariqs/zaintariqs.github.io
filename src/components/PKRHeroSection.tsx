import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRHeroSection = () => {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-crypto-dark">
      {/* Background Layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-hero opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--crypto-cyan)/0.2),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,hsl(var(--crypto-purple)/0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_0%,hsl(var(--crypto-green)/0.05)_50%,transparent_100%)]" />
      </div>
      
      {/* Floating Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.05]">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `linear-gradient(hsl(var(--crypto-green)) 1px, transparent 1px), 
                           linear-gradient(90deg, hsl(var(--crypto-cyan)) 1px, transparent 1px)`, 
          backgroundSize: '60px 60px' 
        }} />
      </div>

      <div className="container relative z-10 px-4 py-20">
        <div className={`flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto ${isUrdu ? 'font-urdu' : ''}`}>
          {/* Main Heading */}
          <div className="space-y-6">
            <div className="inline-flex items-center px-6 py-3 bg-gradient-crypto/20 border border-crypto-cyan/40 rounded-full shadow-cyan backdrop-blur-sm">
              <div className="h-2 w-2 bg-crypto-cyan rounded-full mr-3 shadow-glow" />
              <span className="text-white text-sm font-semibold tracking-wide">
                {isUrdu ? "پاکستان کا پہلا PKR سے محفوظ سٹیبل کوائن" : "Pakistan's First PKR-Backed Stablecoin"}
              </span>
            </div>
            
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight tracking-tight ${isUrdu ? 'text-right' : ''}`}>
              {isUrdu ? (
                <>
                  <span className="inline-block">محفوظ۔ مستحکم۔</span>
                  <span className="block bg-gradient-rainbow bg-clip-text text-transparent drop-shadow-[0_0_40px_hsl(var(--crypto-green)/0.5)]">
                    پاکستانی۔
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block">Stable. Secure.</span>
                  <span className="block bg-gradient-rainbow bg-clip-text text-transparent drop-shadow-[0_0_40px_hsl(var(--crypto-green)/0.5)]">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
            <div className={`relative bg-gradient-crypto/20 backdrop-blur-sm border border-crypto-cyan/30 rounded-2xl p-6 text-center shadow-cyan ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-4xl font-extrabold text-crypto-cyan mb-2">1:1</div>
              <div className="text-gray-300 text-sm font-medium">
                {isUrdu ? "PKR محفوظ" : "PKR Backed"}
              </div>
            </div>
            <div className={`relative bg-gradient-purple/20 backdrop-blur-sm border border-crypto-purple/30 rounded-2xl p-6 text-center shadow-purple ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-4xl font-extrabold text-crypto-purple mb-2">100%</div>
              <div className="text-gray-300 text-sm font-medium">
                {isUrdu ? "شفاف" : "Transparent"}
              </div>
            </div>
            <div className={`relative bg-crypto-gray/40 backdrop-blur-sm border border-crypto-green/30 rounded-2xl p-6 text-center shadow-glow ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-4xl font-extrabold text-crypto-green mb-2">24/7</div>
              <div className="text-gray-300 text-sm font-medium">
                {isUrdu ? "دستیاب" : "Available"}
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 ${isUrdu ? 'sm:flex-row-reverse' : ''}`}>
            <Button 
              size="lg"
              className="bg-gradient-crypto text-white hover:bg-gradient-rainbow shadow-crypto border-0 px-8 py-4 text-lg font-semibold"
              asChild
            >
              <Link to="/learn-more">{t.learnMore}</Link>
            </Button>
          </div>

          {/* Features Preview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-5xl">
            <div className="relative bg-gradient-to-br from-crypto-gray/40 to-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-crypto-green/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-crypto-green" />
              </div>
              <h3 className={`text-xl font-bold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "بینک گریڈ سیکورٹی" : "Bank-Grade Security"}
              </h3>
              <p className={`text-sm text-gray-300 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu 
                  ? "ملٹی سگنیچر والیٹس اور ادارہ جاتی گریڈ انکرپشن آپ کے ڈیجیٹل اثاثوں کو بڑے مالیاتی اداروں کے معیار کے ساتھ محفوظ رکھتا ہے۔"
                  : "Multi-signature wallets and institutional-grade encryption protect your digital assets with the same standards used by major financial institutions."
                }
              </p>
            </div>
            <div className="relative bg-gradient-to-br from-crypto-gray/40 to-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-crypto-green/10 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-crypto-green" />
              </div>
              <h3 className={`text-xl font-bold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "مستحکم قدر" : "Stable Value"}
              </h3>
              <p className={`text-sm text-gray-300 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu
                  ? "ہمیشہ حقیقی PKR ریزرو کے ساتھ پاکستانی روپے کے ساتھ 1:1 کی نسبت۔ کوئی تبدیلی نہیں، صرف قابل اعتماد ڈیجیٹل کرنسی۔"
                  : "Always pegged 1:1 to Pakistani Rupee with real PKR reserves backing every token. No volatility, just reliable digital currency you can trust."
                }
              </p>
            </div>
            <div className="relative bg-gradient-to-br from-crypto-gray/40 to-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 text-center">
              <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-crypto-green/10 flex items-center justify-center">
                <Zap className="h-8 w-8 text-crypto-green" />
              </div>
              <h3 className={`text-xl font-bold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "فوری ٹرانسفر" : "Instant Transfers"}
              </h3>
              <p className={`text-sm text-gray-300 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
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
      <div className="absolute top-20 left-10 w-3 h-3 bg-crypto-green rounded-full opacity-40 blur-[1px]" />
      <div className="absolute top-40 right-16 w-2 h-2 bg-crypto-green-light rounded-full opacity-60" />
      <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-crypto-green rounded-full opacity-30" />
      <div className="absolute bottom-48 right-1/3 w-2 h-2 bg-crypto-green-light rounded-full opacity-50" />
      <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-crypto-green rounded-full opacity-40" />
      <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-crypto-green-light rounded-full opacity-30" />
    </section>
  );
};

export default PKRHeroSection;
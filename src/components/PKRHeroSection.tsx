import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRHeroSection = () => {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-crypto-dark via-[hsl(222,47%,13%)] to-crypto-dark">
      {/* Sophisticated Background Layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-crypto-cyan/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-crypto-green/10 rounded-full blur-[100px]" />
      </div>
      
      {/* Refined Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `linear-gradient(hsl(var(--crypto-cyan)) 1px, transparent 1px), 
                           linear-gradient(90deg, hsl(var(--crypto-cyan)) 1px, transparent 1px)`, 
          backgroundSize: '80px 80px' 
        }} />
      </div>

      <div className="container relative z-10 px-4 py-24 md:py-32">
        <div className={`flex flex-col items-center text-center space-y-12 max-w-5xl mx-auto ${isUrdu ? 'font-urdu' : ''}`}>
          {/* Main Heading */}
          <div className="space-y-8 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-crypto-gray/60 border border-crypto-cyan/20 rounded-full backdrop-blur-md">
              <div className="relative">
                <div className="h-2 w-2 bg-crypto-cyan rounded-full animate-pulse" />
                <div className="absolute inset-0 h-2 w-2 bg-crypto-cyan rounded-full animate-ping" />
              </div>
              <span className="text-gray-200 text-sm font-medium tracking-wider">
                {isUrdu ? "پاکستان کا پہلا PKR سے محفوظ سٹیبل کوائن" : "Pakistan's First PKR-Backed Stablecoin"}
              </span>
            </div>
            
            <h1 className={`text-5xl md:text-7xl lg:text-[6rem] font-bold text-white leading-[1.1] tracking-tight ${isUrdu ? 'text-right' : ''}`}>
              {isUrdu ? (
                <>
                  <span className="block text-gray-100 font-light">محفوظ۔ مستحکم۔</span>
                  <span className="block bg-gradient-rainbow bg-clip-text text-transparent mt-2">
                    پاکستانی۔
                  </span>
                </>
              ) : (
                <>
                  <span className="block text-gray-100 font-light">Stable. Secure.</span>
                  <span className="block bg-gradient-rainbow bg-clip-text text-transparent mt-2">
                    Pakistani.
                  </span>
                </>
              )}
            </h1>
            
            <p className={`text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light ${isUrdu ? 'text-right' : ''}`}>
              {t.heroSubtitle}
            </p>
          </div>

          {/* Key Stats - Refined */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
            <div className={`group relative bg-gradient-card backdrop-blur-md border border-crypto-cyan/15 rounded-xl p-8 text-center hover:border-crypto-cyan/30 transition-all duration-300 ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-5xl font-bold text-crypto-cyan mb-3 group-hover:scale-110 transition-transform">1:1</div>
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                {isUrdu ? "PKR محفوظ" : "PKR Backed"}
              </div>
            </div>
            <div className={`group relative bg-gradient-card backdrop-blur-md border border-crypto-purple/15 rounded-xl p-8 text-center hover:border-crypto-purple/30 transition-all duration-300 ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-5xl font-bold text-crypto-purple mb-3 group-hover:scale-110 transition-transform">100%</div>
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">
                {isUrdu ? "شفاف" : "Transparent"}
              </div>
            </div>
            <div className={`group relative bg-gradient-card backdrop-blur-md border border-crypto-green/15 rounded-xl p-8 text-center hover:border-crypto-green/30 transition-all duration-300 ${isUrdu ? 'text-right' : ''}`}>
              <div className="text-5xl font-bold text-crypto-green mb-3 group-hover:scale-110 transition-transform">24/7</div>
              <div className="text-gray-400 text-sm font-medium uppercase tracking-wider">
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

          {/* Features Preview - Refined */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-6xl">
            <div className="group relative bg-gradient-card backdrop-blur-md border border-white/5 rounded-2xl p-8 hover:border-crypto-green/20 transition-all duration-500 hover:shadow-elegant">
              <div className="mx-auto mb-6 h-14 w-14 rounded-xl bg-crypto-green/10 flex items-center justify-center group-hover:bg-crypto-green/15 transition-colors">
                <Shield className="h-7 w-7 text-crypto-green" />
              </div>
              <h3 className={`text-lg font-semibold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "غیر تحویلی فن تعمیر" : "Non-Custodial Architecture"}
              </h3>
              <p className={`text-sm text-gray-400 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu 
                  ? "آپ اپنے اثاثوں پر مکمل کنٹرول برقرار رکھتے ہیں۔ ہم کبھی بھی آپ کے فنڈز کو نہیں رکھتے، صرف کرپٹو اور کیش کے درمیان محفوظ پل فراہم کرتے ہیں۔"
                  : "You maintain complete control of your assets in your own wallet. We never hold your funds, only provide a secure bridge between crypto and cash."
                }
              </p>
            </div>
            <div className="group relative bg-gradient-card backdrop-blur-md border border-white/5 rounded-2xl p-8 hover:border-crypto-green/20 transition-all duration-500 hover:shadow-elegant">
              <div className="mx-auto mb-6 h-14 w-14 rounded-xl bg-crypto-green/10 flex items-center justify-center group-hover:bg-crypto-green/15 transition-colors">
                <TrendingUp className="h-7 w-7 text-crypto-green" />
              </div>
              <h3 className={`text-lg font-semibold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu ? "مستحکم قدر" : "Stable Value"}
              </h3>
              <p className={`text-sm text-gray-400 leading-relaxed ${isUrdu ? 'text-right' : ''}`}>
                {isUrdu
                  ? "ہمیشہ حقیقی PKR ریزرو کے ساتھ پاکستانی روپے کے ساتھ 1:1 کی نسبت۔ کوئی تبدیلی نہیں، صرف قابل اعتماد ڈیجیٹل کرنسی۔"
                  : "Always pegged 1:1 to Pakistani Rupee with real PKR reserves backing every token. No volatility, just reliable digital currency you can trust."
                }
              </p>
            </div>
            <div className="group relative bg-gradient-card backdrop-blur-md border border-white/5 rounded-2xl p-8 hover:border-crypto-green/20 transition-all duration-500 hover:shadow-elegant">
              <div className="mx-auto mb-6 h-14 w-14 rounded-xl bg-crypto-green/10 flex items-center justify-center group-hover:bg-crypto-green/15 transition-colors">
                <Zap className="h-7 w-7 text-crypto-green" />
              </div>
              <h3 className={`text-lg font-semibold text-white mb-3 ${isUrdu ? 'text-right' : ''}`}>
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
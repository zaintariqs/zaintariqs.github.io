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
      {/* Animated Background Layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(34,197,94,0.15),transparent_50%)] animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(34,197,94,0.1),transparent_50%)] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_0%,rgba(34,197,94,0.03)_50%,transparent_100%)] animate-[pulse_4s_ease-in-out_infinite]" />
      </div>
      
      {/* Floating Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(34,197,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.5) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
      </div>

      <div className="container relative z-10 px-4 py-20">
        <div className={`flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto ${isUrdu ? 'font-urdu' : ''}`}>
          {/* Main Heading */}
          <div className="space-y-6 animate-fade-in">
            <div className="inline-flex items-center px-5 py-2.5 bg-crypto-green/10 border border-crypto-green/30 rounded-full shadow-glow backdrop-blur-sm hover:scale-105 transition-transform duration-300">
              <div className="h-2 w-2 bg-crypto-green rounded-full animate-pulse mr-3" />
              <span className="text-crypto-green text-sm font-semibold tracking-wide">
                {isUrdu ? "پاکستان کا پہلا PKR سے محفوظ سٹیبل کوائن" : "Pakistan's First PKR-Backed Stablecoin"}
              </span>
            </div>
            
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-extrabold text-white leading-tight tracking-tight ${isUrdu ? 'text-right' : ''}`}>
              {isUrdu ? (
                <>
                  <span className="inline-block animate-fade-in" style={{ animationDelay: '0.1s' }}>محفوظ۔ مستحکم۔</span>
                  <span className="block bg-gradient-to-r from-crypto-green via-crypto-green-light to-crypto-green bg-clip-text text-transparent animate-fade-in drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]" style={{ animationDelay: '0.3s' }}>
                    پاکستانی۔
                  </span>
                </>
              ) : (
                <>
                  <span className="inline-block animate-fade-in" style={{ animationDelay: '0.1s' }}>Stable. Secure.</span>
                  <span className="block bg-gradient-to-r from-crypto-green via-crypto-green-light to-crypto-green bg-clip-text text-transparent animate-fade-in drop-shadow-[0_0_30px_rgba(34,197,94,0.3)]" style={{ animationDelay: '0.3s' }}>
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
            <div className={`group relative bg-crypto-gray/30 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-6 text-center hover:border-crypto-green/50 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 ${isUrdu ? 'text-right' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <div className="text-4xl font-extrabold text-crypto-green mb-2 group-hover:scale-110 transition-transform duration-300">1:1</div>
                <div className="text-gray-300 text-sm font-medium">
                  {isUrdu ? "PKR محفوظ" : "PKR Backed"}
                </div>
              </div>
            </div>
            <div className={`group relative bg-crypto-gray/30 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-6 text-center hover:border-crypto-green/50 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 ${isUrdu ? 'text-right' : ''}`} style={{ animationDelay: '0.1s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <div className="text-4xl font-extrabold text-crypto-green mb-2 group-hover:scale-110 transition-transform duration-300">100%</div>
                <div className="text-gray-300 text-sm font-medium">
                  {isUrdu ? "شفاف" : "Transparent"}
                </div>
              </div>
            </div>
            <div className={`group relative bg-crypto-gray/30 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-6 text-center hover:border-crypto-green/50 hover:shadow-glow transition-all duration-300 hover:-translate-y-1 ${isUrdu ? 'text-right' : ''}`} style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300" />
              <div className="relative">
                <div className="text-4xl font-extrabold text-crypto-green mb-2 group-hover:scale-110 transition-transform duration-300">24/7</div>
                <div className="text-gray-300 text-sm font-medium">
                  {isUrdu ? "دستیاب" : "Available"}
                </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full max-w-5xl">
            <div className="group relative bg-gradient-to-br from-crypto-gray/40 to-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 text-center hover:border-crypto-green/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(34,197,94,0.4)]">
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
              <div className="relative">
                <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-crypto-green/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
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
            </div>
            <div className="group relative bg-gradient-to-br from-crypto-gray/40 to-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 text-center hover:border-crypto-green/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(34,197,94,0.4)]" style={{ animationDelay: '0.1s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
              <div className="relative">
                <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-crypto-green/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
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
            </div>
            <div className="group relative bg-gradient-to-br from-crypto-gray/40 to-crypto-gray/20 backdrop-blur-sm border border-crypto-green/20 rounded-2xl p-8 text-center hover:border-crypto-green/60 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_60px_-15px_rgba(34,197,94,0.4)]" style={{ animationDelay: '0.2s' }}>
              <div className="absolute inset-0 bg-gradient-to-br from-crypto-green/5 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-500" />
              <div className="relative">
                <div className="mx-auto mb-4 h-16 w-16 rounded-xl bg-crypto-green/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
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
      </div>

      {/* Floating Animated Elements */}
      <div className="absolute top-20 left-10 w-3 h-3 bg-crypto-green rounded-full animate-bounce opacity-40 blur-[1px]" />
      <div className="absolute top-40 right-16 w-2 h-2 bg-crypto-green-light rounded-full animate-pulse opacity-60" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-32 left-1/4 w-4 h-4 bg-crypto-green rounded-full animate-ping opacity-30" />
      <div className="absolute bottom-48 right-1/3 w-2 h-2 bg-crypto-green-light rounded-full animate-bounce opacity-50" style={{ animationDelay: '0.5s' }} />
      <div className="absolute top-1/3 left-1/3 w-2 h-2 bg-crypto-green rounded-full animate-pulse opacity-40" style={{ animationDuration: '2s' }} />
      <div className="absolute top-2/3 right-1/4 w-3 h-3 bg-crypto-green-light rounded-full animate-bounce opacity-30" style={{ animationDelay: '1s' }} />
    </section>
  );
};

export default PKRHeroSection;
// PKRFooter component for PKRSC application
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRFooter = () => {
  const { language, isUrdu } = useLanguage();
  const t = translations[language];

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/905314390365", "_blank");
  };

  return (
    <footer className="bg-crypto-dark border-t border-crypto-gray">
      <div className="container px-4 py-12">
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${isUrdu ? 'text-right' : ''}`}>
          {/* Brand Section */}
          <div className="space-y-4">
            <div className={`flex items-center ${isUrdu ? 'flex-row-reverse space-x-reverse space-x-3' : 'space-x-3'}`}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-crypto-green to-crypto-green/80">
                <span className="text-sm font-bold text-white">₨</span>
              </div>
              <span className="text-xl font-bold text-white">PKR Stable</span>
            </div>
            <p className="text-gray-400 text-sm">
              {t.footerTagline}
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">{t.quickLinks}</h4>
            <div className="space-y-2 text-sm">
              <a href="#features" className="block text-gray-400 hover:text-crypto-green transition-colors">{t.features}</a>
              <Link to="/security" className="block text-gray-400 hover:text-crypto-green transition-colors">{t.security}</Link>
              <Link to="/learn-more" className="block text-gray-400 hover:text-crypto-green transition-colors">{t.learnMore}</Link>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">{t.contactInfo}</h4>
            <div className="space-y-3">
              <button 
                onClick={handleWhatsAppContact}
                className={`flex items-center text-sm text-gray-400 hover:text-crypto-green transition-colors ${isUrdu ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'}`}
              >
                <MessageCircle className="h-4 w-4" />
                <span>{t.whatsapp}</span>
              </button>
              <div className={`flex items-center text-sm text-gray-400 ${isUrdu ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'}`}>
                <Mail className="h-4 w-4" />
                <span>{t.email}</span>
              </div>
              <div className={`flex items-center text-sm text-gray-400 ${isUrdu ? 'flex-row-reverse space-x-reverse space-x-2' : 'space-x-2'}`}>
                <MapPin className="h-4 w-4" />
                <span>{t.lahore}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-crypto-gray mt-8 pt-8">
          <div className={`flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 ${isUrdu ? 'md:flex-row-reverse' : ''}`}>
            <p className="text-gray-400 text-sm">
              {t.copyright}
            </p>
            <div className={`text-gray-400 text-sm ${isUrdu ? 'md:text-left' : 'md:text-right'}`}>
              {t.compliance}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PKRFooter;
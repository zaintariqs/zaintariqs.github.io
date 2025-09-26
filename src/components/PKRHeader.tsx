import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageCircle, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";

const PKRHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { language, setLanguage, isUrdu } = useLanguage();
  const t = translations[language];

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/905314390365", "_blank");
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'ur' : 'en');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-crypto-gray bg-crypto-dark/95 backdrop-blur supports-[backdrop-filter]:bg-crypto-dark/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-crypto-green to-crypto-green/80">
            <span className="text-sm font-bold text-white">₨</span>
          </div>
          <span className="text-xl font-bold text-white">PKR Stable</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={`hidden md:flex items-center ${isUrdu ? 'space-x-reverse space-x-8' : 'space-x-8'}`}>
          <a href="#features" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
            {t.features}
          </a>
          <Link to="/security" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
            {t.security}
          </Link>
          <Link to="/learn-more" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
            {t.learnMore}
          </Link>
        </nav>

        {/* Contact Button & Language Toggle */}
        <div className={`hidden md:flex items-center ${isUrdu ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
          <Button
            onClick={toggleLanguage}
            variant="ghost"
            size="sm"
            className="text-gray-300 hover:text-crypto-green"
          >
            <Globe className="h-4 w-4 mr-2" />
            {language === 'en' ? 'اردو' : 'EN'}
          </Button>
          <Button 
            onClick={handleWhatsAppContact}
            className="bg-crypto-green hover:bg-crypto-green/90 text-white"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            {t.contactUs}
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden text-white"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-crypto-gray bg-crypto-dark">
          <div className="container py-4 space-y-4">
            <a href="#features" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.features}
            </a>
            <Link to="/security" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.security}
            </Link>
            <Link to="/learn-more" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.learnMore}
            </Link>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => {
                  toggleLanguage();
                  setIsMenuOpen(false);
                }}
                variant="ghost"
                size="sm"
                className="text-gray-300 hover:text-crypto-green"
              >
                <Globe className="h-4 w-4 mr-2" />
                {language === 'en' ? 'اردو' : 'EN'}
              </Button>
            </div>
            <Button 
              onClick={() => {
                handleWhatsAppContact();
                setIsMenuOpen(false);
              }}
              className="w-full bg-crypto-green hover:bg-crypto-green/90 text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t.contactUs}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default PKRHeader;
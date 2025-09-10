import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, MessageCircle } from "lucide-react";

const PKRHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleWhatsAppContact = () => {
    window.open("https://wa.me/+905324390365", "_blank");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-crypto-gray bg-crypto-dark/95 backdrop-blur supports-[backdrop-filter]:bg-crypto-dark/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-crypto-green to-crypto-green/80">
            <span className="text-sm font-bold text-white">₨</span>
          </div>
          <span className="text-xl font-bold text-white">PKR Stable</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <a href="#features" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
            Features
          </a>
          <a href="#security" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
            Security
          </a>
          <a href="#whitepaper" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
            Whitepaper
          </a>
        </nav>

        {/* Contact Button */}
        <div className="hidden md:flex items-center space-x-4">
          <Button 
            onClick={handleWhatsAppContact}
            className="bg-crypto-green hover:bg-crypto-green/90 text-white"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Contact Us
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
              Features
            </a>
            <a href="#security" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              Security
            </a>
            <a href="#whitepaper" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              Whitepaper
            </a>
            <Button 
              onClick={handleWhatsAppContact}
              className="w-full bg-crypto-green hover:bg-crypto-green/90 text-white"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Us
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default PKRHeader;
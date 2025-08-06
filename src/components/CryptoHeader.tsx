import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Wheat, Menu, X, User, Wallet, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import croptoLogo from "@/assets/cropto-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-crypto-gray bg-crypto-dark/95 backdrop-blur supports-[backdrop-filter]:bg-crypto-dark/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg">
            <img src={croptoLogo} alt="Cropto" className="h-8 w-8" />
          </div>
          <span className="text-xl font-bold text-white">Cropto</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <div className="relative group">
            <button className="text-sm font-medium text-gray-300 hover:text-primary transition-colors flex items-center">
              Corporate
              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="relative group">
            <button className="text-sm font-medium text-gray-300 hover:text-primary transition-colors flex items-center">
              Tokens
              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="relative group">
            <button className="text-sm font-medium text-gray-300 hover:text-primary transition-colors flex items-center">
              Transparency
              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          <div className="relative group">
            <button className="text-sm font-medium text-gray-300 hover:text-primary transition-colors flex items-center">
              Legal
              <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </nav>

        {/* Desktop Auth Buttons */}
        <div className="hidden md:flex items-center space-x-4">
          <Button variant="outline" size="sm" className="border-crypto-green text-crypto-green hover:bg-crypto-green hover:text-white">
            Whitepaper
          </Button>
          <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white">
            <Globe className="h-4 w-4 mr-2" />
            EN
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
            <button className="block text-sm font-medium text-gray-300 hover:text-primary transition-colors">
              Corporate
            </button>
            <button className="block text-sm font-medium text-gray-300 hover:text-primary transition-colors">
              Tokens
            </button>
            <button className="block text-sm font-medium text-gray-300 hover:text-primary transition-colors">
              Transparency
            </button>
            <button className="block text-sm font-medium text-gray-300 hover:text-primary transition-colors">
              Legal
            </button>
            <div className="flex flex-col space-y-2 pt-4 border-t border-crypto-gray">
              <Button variant="outline" size="sm" className="border-crypto-green text-crypto-green hover:bg-crypto-green hover:text-white">
                Whitepaper
              </Button>
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white justify-start">
                <Globe className="h-4 w-4 mr-2" />
                EN
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
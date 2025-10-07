import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Menu, X, UserCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { translations } from "@/translations";
import { WalletConnect } from "@/components/WalletConnect";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WhitelistForm } from "@/components/WhitelistForm";

const PKRHeader = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWhitelistOpen, setIsWhitelistOpen] = useState(false);
  const { address } = useAccount();
  const { language, setLanguage, isUrdu } = useLanguage();
  const t = translations[language];
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';


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
        {!isDashboard && (
          <nav className={`hidden md:flex items-center ${isUrdu ? 'space-x-reverse space-x-8' : 'space-x-8'}`}>
            <a href="#features" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.features}
            </a>
            <Link to="/security" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.security}
            </Link>
            <Link to="/faq" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.faq}
            </Link>
            <Link to="/learn-more" className="text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
              {t.learnMore}
            </Link>
          </nav>
        )}

        {/* Wallet Connect & Whitelist Button */}
        <div className={`hidden md:flex items-center ${isUrdu ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
          <WalletConnect />
          {!address && (
            <Dialog open={isWhitelistOpen} onOpenChange={setIsWhitelistOpen}>
              <DialogTrigger asChild>
                <Button className="bg-crypto-green hover:bg-crypto-green/90 text-white">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Get Whitelisted
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Apply for Whitelist</DialogTitle>
                  <DialogDescription>
                    To access PKRSC services, submit your wallet address and email for approval.
                  </DialogDescription>
                </DialogHeader>
                <WhitelistForm />
              </DialogContent>
            </Dialog>
          )}
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
            <div className="mb-4">
              <WalletConnect />
            </div>
            {!isDashboard && (
              <>
                <a href="#features" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
                  {t.features}
                </a>
                <Link to="/security" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
                  {t.security}
                </Link>
                <Link to="/faq" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
                  {t.faq}
                </Link>
                <Link to="/learn-more" className="block text-sm font-medium text-gray-300 hover:text-crypto-green transition-colors">
                  {t.learnMore}
                </Link>
              </>
            )}
            {!address && (
              <Dialog open={isWhitelistOpen} onOpenChange={setIsWhitelistOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full bg-crypto-green hover:bg-crypto-green/90 text-white">
                    <UserCheck className="h-4 w-4 mr-2" />
                    Get Whitelisted
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Apply for Whitelist</DialogTitle>
                    <DialogDescription>
                      To access PKRSC services, submit your wallet address and email for approval.
                    </DialogDescription>
                  </DialogHeader>
                  <WhitelistForm />
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PKRHeader;
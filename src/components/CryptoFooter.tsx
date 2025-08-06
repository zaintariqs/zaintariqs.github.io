import { Twitter, Facebook, Linkedin, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import croptoLogo from "@/assets/cropto-logo.png";

const CryptoFooter = () => {
  return (
    <footer className="bg-crypto-dark border-t border-crypto-gray">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img src={croptoLogo} alt="Cropto" className="h-8 w-8" />
              <span className="text-xl font-bold text-white">Cropto</span>
            </div>
            <p className="text-sm text-gray-400">
              The world's first and most comprehensive agricultural-focused RWA token family, 
              revolutionizing commodity investments through blockchain technology.
            </p>
            <div className="flex items-center space-x-4">
              <a href="#" className="text-gray-400 hover:text-crypto-green transition-colors">
                <Twitter className="h-4 w-4" />
              </a>
              <a href="#" className="text-gray-400 hover:text-crypto-green transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="text-gray-400 hover:text-crypto-green transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="#" className="text-gray-400 hover:text-crypto-green transition-colors">
                <Mail className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Corporate */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Corporate</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/about" className="text-gray-400 hover:text-crypto-green transition-colors">
                  About Cropto
                </Link>
              </li>
              <li>
                <Link to="/team" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Our Team
                </Link>
              </li>
              <li>
                <Link to="/investors" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Investors
                </Link>
              </li>
              <li>
                <Link to="/partnerships" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Partnerships
                </Link>
              </li>
            </ul>
          </div>

          {/* Tokens */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Tokens</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/tokens/crow" className="text-gray-400 hover:text-crypto-green transition-colors">
                  CROW Token
                </Link>
              </li>
              <li>
                <Link to="/tokens/crof" className="text-gray-400 hover:text-crypto-green transition-colors">
                  CROF Token
                </Link>
              </li>
              <li>
                <Link to="/token-economics" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Tokenomics
                </Link>
              </li>
              <li>
                <Link to="/roadmap" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Roadmap
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h3 className="font-semibold mb-4 text-white">Legal & Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/compliance" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Compliance
                </Link>
              </li>
              <li>
                <Link to="/support" className="text-gray-400 hover:text-crypto-green transition-colors">
                  Support
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-crypto-gray flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-400">
            © 2024 Cropto. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link to="/whitepaper" className="text-sm text-gray-400 hover:text-crypto-green transition-colors">
              Whitepaper
            </Link>
            <Link to="/audit-reports" className="text-sm text-gray-400 hover:text-crypto-green transition-colors">
              Audit Reports
            </Link>
            <Link to="/transparency" className="text-sm text-gray-400 hover:text-crypto-green transition-colors">
              Transparency
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default CryptoFooter;
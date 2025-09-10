import { MessageCircle, Mail, MapPin, Phone } from "lucide-react";

const PKRFooter = () => {
  const handleWhatsAppContact = () => {
    window.open("https://wa.me/+905324390365", "_blank");
  };

  return (
    <footer className="bg-crypto-dark border-t border-crypto-gray">
      <div className="container px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-crypto-green to-crypto-green/80">
                <span className="text-sm font-bold text-white">₨</span>
              </div>
              <span className="text-xl font-bold text-white">PKR Stable</span>
            </div>
            <p className="text-gray-400 text-sm">
              Pakistan's first PKR-backed stablecoin. Stable, secure, and built for the Pakistani market.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Quick Links</h4>
            <div className="space-y-2 text-sm">
              <a href="#features" className="block text-gray-400 hover:text-crypto-green transition-colors">Features</a>
              <a href="#security" className="block text-gray-400 hover:text-crypto-green transition-colors">Security</a>
              <a href="#whitepaper" className="block text-gray-400 hover:text-crypto-green transition-colors">Whitepaper</a>
              <a href="#about" className="block text-gray-400 hover:text-crypto-green transition-colors">About Us</a>
            </div>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Legal</h4>
            <div className="space-y-2 text-sm">
              <a href="#privacy" className="block text-gray-400 hover:text-crypto-green transition-colors">Privacy Policy</a>
              <a href="#terms" className="block text-gray-400 hover:text-crypto-green transition-colors">Terms of Service</a>
              <a href="#compliance" className="block text-gray-400 hover:text-crypto-green transition-colors">Compliance</a>
              <a href="#aml" className="block text-gray-400 hover:text-crypto-green transition-colors">AML Policy</a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Contact Us</h4>
            <div className="space-y-3">
              <button 
                onClick={handleWhatsAppContact}
                className="flex items-center space-x-2 text-sm text-gray-400 hover:text-crypto-green transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                <span>WhatsApp Support</span>
              </button>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Mail className="h-4 w-4" />
                <span>support@pkrstable.pk</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Phone className="h-4 w-4" />
                <span>+92 300 123 4567</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <MapPin className="h-4 w-4" />
                <span>Karachi, Pakistan</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-crypto-gray mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © 2024 PKR Stable. All rights reserved.
            </p>
            <div className="text-gray-400 text-sm">
              Regulated and compliant with Pakistani financial laws
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default PKRFooter;
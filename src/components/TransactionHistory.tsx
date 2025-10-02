import { useLanguage } from "@/contexts/LanguageContext";

const TransactionHistory = () => {
  const { language, isUrdu } = useLanguage();

  return (
    <section className="relative py-24 bg-crypto-dark overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-crypto-cyan/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-crypto-purple/5 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10 px-4">
        <div className={`text-center mb-12 ${isUrdu ? 'font-urdu' : ''}`}>
          <h2 className={`text-4xl md:text-5xl font-bold text-white mb-4 ${isUrdu ? 'text-right' : ''}`}>
            {isUrdu ? "لین دین کی تاریخ" : "Transaction History"}
          </h2>
          <p className={`text-lg text-gray-400 max-w-2xl mx-auto ${isUrdu ? 'text-right' : ''}`}>
            {isUrdu 
              ? "بلاکچین پر لائیو ٹرانزیکشنز دیکھیں - مکمل شفافیت"
              : "View live transactions on the blockchain - complete transparency"
            }
          </p>
        </div>

        <div className="max-w-6xl mx-auto">
          <div className="relative bg-gradient-card backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-elegant">
            <div className="aspect-[16/10] w-full">
              <iframe
                src="https://basescan.org/address/0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5"
                className="w-full h-full"
                title="BaseScan Transaction History"
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
            </div>
            <div className="p-4 bg-crypto-gray/40 border-t border-white/5">
              <a
                href="https://basescan.org/address/0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5"
                target="_blank"
                rel="noopener noreferrer"
                className="text-crypto-cyan hover:text-crypto-cyan-light text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {isUrdu ? "BaseScan پر مکمل تاریخ دیکھیں" : "View Full History on BaseScan"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransactionHistory;

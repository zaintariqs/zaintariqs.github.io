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

        <div className="max-w-4xl mx-auto">
          <a
            href="https://basescan.org/address/0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e"
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <div className="relative bg-gradient-card backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-elegant hover:border-crypto-cyan/30 transition-all duration-300 p-12">
              <div className="text-center space-y-6">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-crypto-cyan/10 group-hover:bg-crypto-cyan/20 transition-colors">
                  <svg className="w-10 h-10 text-crypto-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                
                <div className="space-y-3">
                  <h3 className="text-2xl font-bold text-white group-hover:text-crypto-cyan transition-colors">
                    {isUrdu ? "لائیو بلاکچین ڈیٹا" : "Live Blockchain Data"}
                  </h3>
                  <p className="text-gray-400 text-base max-w-xl mx-auto">
                    {isUrdu 
                      ? "BaseScan پر تمام ٹرانزیکشنز، بیلنسز اور سمارٹ کنٹریکٹ کی سرگرمیاں دیکھیں"
                      : "View all transactions, balances, and smart contract activity on BaseScan"
                    }
                  </p>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-2 text-crypto-cyan font-semibold group-hover:gap-3 transition-all">
                      {isUrdu ? "BaseScan پر دیکھیں" : "View on BaseScan"}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5">
                  <p className="text-xs text-gray-500 font-mono">
                    0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e
                  </p>
                </div>
              </div>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
};

export default TransactionHistory;

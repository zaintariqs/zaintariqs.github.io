import { CryptoExchangeSection } from '@/components/dashboard/CryptoExchangeSection';

export default function CryptoExchangePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Crypto Exchange
        </h1>
        <p className="text-white/70">
          Convert your crypto assets to USDT instantly
        </p>
      </div>

      <CryptoExchangeSection />
    </div>
  );
}

import CryptoHeader from "@/components/CryptoHeader";
import CryptoFooter from "@/components/CryptoFooter";
import CryptoHeroSection from "@/components/CryptoHeroSection";
import CryptoTokenSection from "@/components/CryptoTokenSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-crypto-dark">
      <CryptoHeader />
      <main>
        <CryptoHeroSection />
        <CryptoTokenSection />
      </main>
      <CryptoFooter />
    </div>
  );
};

export default Index;

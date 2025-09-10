import PKRHeader from "@/components/PKRHeader";
import PKRHeroSection from "@/components/PKRHeroSection";
import PKRFeaturesSection from "@/components/PKRFeaturesSection";
import PKRFooter from "@/components/PKRFooter";

const Index = () => {
  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <main>
        <PKRHeroSection />
        <PKRFeaturesSection />
      </main>
      <PKRFooter />
    </div>
  );
};

export default Index;

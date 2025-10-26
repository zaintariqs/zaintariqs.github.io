import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Web3Provider } from "@/providers/Web3Provider";
import { SecurityProvider } from "@/components/SecurityProvider";
import { WhitelistCheck } from "@/components/WhitelistCheck";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import Security from "./pages/Security";
import LearnMore from "./pages/LearnMore";
import FAQ from "./pages/FAQ";
import Dashboard from "./pages/Dashboard";
import PKRSCV2 from "./pages/PKRSCV2";
import PKRSCV2Dashboard from "./pages/PKRSCV2Dashboard";
import V2AdminPage from "./pages/admin/V2AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  
  return (
    <>
      <Toaster />
      <Sonner />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/security" element={<Security />} />
        <Route path="/learn-more" element={<LearnMore />} />
        <Route path="/faq" element={<FAQ />} />
          <Route path="/pkrsc/v2" element={<PKRSCV2 />} />
          <Route path="/pkrsc/v2/dashboard" element={<PKRSCV2Dashboard />} />
          <Route path="/pkrsc/v2/admin" element={<V2AdminPage />} />
        <Route path="/dashboard/*" element={
          <WhitelistCheck>
            <Dashboard />
          </WhitelistCheck>
        } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <SecurityProvider>
        <TooltipProvider>
          <LanguageProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </LanguageProvider>
        </TooltipProvider>
      </SecurityProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;

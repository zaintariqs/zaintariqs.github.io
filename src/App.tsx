import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import MouseFollowingBits from "@/components/MouseFollowingBits";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Web3Provider } from "@/providers/Web3Provider";
import Index from "./pages/Index";
import Browse from "./pages/Browse";
import Security from "./pages/Security";
import LearnMore from "./pages/LearnMore";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <Web3Provider>
      <TooltipProvider>
        <LanguageProvider>
          <MouseFollowingBits />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/security" element={<Security />} />
              <Route path="/learn-more" element={<LearnMore />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
    </Web3Provider>
  </QueryClientProvider>
);

export default App;

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import PKRHeader from "@/components/PKRHeader";
import PKRFooter from "@/components/PKRFooter";
import { WhitelistCheck } from "@/components/WhitelistCheck";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, RefreshCw, Loader2, Copy, CheckCircle2 } from "lucide-react";

const PKRSCV2Dashboard = () => {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [usdPkrRate, setUsdPkrRate] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [usdtAmount, setUsdtAmount] = useState("");
  const [pkrAmount, setPkrAmount] = useState(0);
  const [depositAddress, setDepositAddress] = useState("");
  const [depositId, setDepositId] = useState("");
  const [showDeposit, setShowDeposit] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fee calculations
  const MINT_FEE_PERCENT = 0.3;
  const BURN_FEE_PERCENT = 0.3;
  const TOTAL_FEE_PERCENT = MINT_FEE_PERCENT + BURN_FEE_PERCENT;

  const grossPkrAmount = pkrAmount;
  const mintFee = (grossPkrAmount * MINT_FEE_PERCENT) / 100;
  const burnFee = (grossPkrAmount * BURN_FEE_PERCENT) / 100;
  const totalFees = mintFee + burnFee;
  const netPkrAmount = grossPkrAmount - totalFees;

  useEffect(() => {
    if (!isConnected) {
      navigate("/pkrsc/v2");
    }
  }, [isConnected, navigate]);

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  useEffect(() => {
    if (usdtAmount && usdPkrRate) {
      const usdt = parseFloat(usdtAmount);
      if (!isNaN(usdt)) {
        setPkrAmount(usdt * usdPkrRate);
      } else {
        setPkrAmount(0);
      }
    } else {
      setPkrAmount(0);
    }
  }, [usdtAmount, usdPkrRate]);

  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-usd-pkr-rate');
      
      if (error) throw error;
      
      if (data?.success) {
        setUsdPkrRate(data.rate);
        toast({
          title: "Exchange Rate Updated",
          description: `1 USD = ${data.rate.toFixed(2)} PKR`,
        });
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
      toast({
        title: "Error",
        description: "Failed to fetch exchange rate",
        variant: "destructive",
      });
    }
  };

  const handleProceedToDeposit = async () => {
    if (!usdtAmount || parseFloat(usdtAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid USDT amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-deposit-address', {
        headers: {
          'x-wallet-address': address
        },
        body: {
          usdtAmount: parseFloat(usdtAmount),
          pkrAmount,
          exchangeRate: usdPkrRate
        }
      });

      if (error) throw error;

      if (data?.success) {
        setDepositAddress(data.depositAddress);
        setDepositId(data.depositId);
        setShowDeposit(true);
        toast({
          title: "Deposit Address Generated",
          description: "Send USDT to the address below",
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "Failed to generate deposit address",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied!",
      description: "Deposit address copied to clipboard",
    });
  };

  const startNewExchange = () => {
    setShowDeposit(false);
    setUsdtAmount("");
    setPkrAmount(0);
    setDepositAddress("");
    setDepositId("");
  };

  return (
    <div className="min-h-screen bg-crypto-dark">
      <PKRHeader />
      <WhitelistCheck>
        <main className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="text-center space-y-4">
              <h1 className="text-4xl font-bold text-white">USDT to PKR Exchange</h1>
              <p className="text-white/70">Convert USDT to Pakistani Rupees instantly</p>
            </div>

            {!showDeposit ? (
              <>
                {/* Exchange Rate Card */}
                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-white/70 text-sm mb-1">Current Exchange Rate</p>
                      <p className="text-3xl font-bold text-white">
                        1 USD = {usdPkrRate.toFixed(2)} PKR
                      </p>
                    </div>
                    <Button
                      onClick={fetchExchangeRate}
                      variant="outline"
                      size="icon"
                      className="border-white/20 text-white hover:bg-white/10"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>

                {/* Exchange Form */}
                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="space-y-6">
                    <div>
                      <label className="text-white text-sm mb-2 block">USDT Amount</label>
                      <Input
                        type="number"
                        placeholder="Enter USDT amount"
                        value={usdtAmount}
                        onChange={(e) => setUsdtAmount(e.target.value)}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div className="flex items-center justify-center">
                      <ArrowRight className="w-6 h-6 text-primary" />
                    </div>

                    <div>
                      <label className="text-white text-sm mb-2 block">Fee Breakdown</label>
                      <div className="bg-white/10 border border-white/20 rounded-md p-4 space-y-3">
                        <div className="flex justify-between text-white/70 text-sm">
                          <span>Gross PKR Amount:</span>
                          <span>{grossPkrAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                        </div>
                        <div className="flex justify-between text-white/70 text-sm">
                          <span>Mint Fee (0.3%):</span>
                          <span>-{mintFee.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                        </div>
                        <div className="flex justify-between text-white/70 text-sm">
                          <span>Burn Fee (0.3%):</span>
                          <span>-{burnFee.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                        </div>
                        <div className="border-t border-white/20 pt-2 flex justify-between text-white/70 text-sm">
                          <span>Total Fees (0.6%):</span>
                          <span>-{totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                        </div>
                        <div className="border-t border-white/20 pt-2 flex justify-between">
                          <span className="text-white font-semibold">Net Amount in Bank:</span>
                          <span className="text-2xl font-bold text-primary">
                            {netPkrAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleProceedToDeposit}
                      disabled={loading || !usdtAmount}
                      className="w-full bg-primary hover:bg-primary/90"
                      size="lg"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Proceed to Deposit"
                      )}
                    </Button>
                  </div>
                </Card>
              </>
            ) : (
              /* Deposit Instructions */
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="space-y-6">
                  <div className="text-center">
                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-white mb-2">Send USDT to Complete</h2>
                    <p className="text-white/70">Send exactly {usdtAmount} USDT on Base mainnet</p>
                  </div>

                  <div>
                    <label className="text-white text-sm mb-2 block">Deposit Address (Base Network)</label>
                    <div className="flex gap-2">
                      <Input
                        value={depositAddress}
                        readOnly
                        className="bg-white/10 border-white/20 text-white font-mono"
                      />
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        size="icon"
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
                    <p className="text-white text-sm">
                      <strong>Important:</strong> Only send USDT on Base mainnet. Sending tokens on other networks will result in loss of funds.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-white/70 text-sm">Exchange Summary:</p>
                    <div className="bg-white/10 rounded-md p-4 space-y-2">
                      <div className="flex justify-between text-white">
                        <span>USDT Amount:</span>
                        <span className="font-semibold">{usdtAmount} USDT</span>
                      </div>
                      <div className="flex justify-between text-white">
                        <span>Exchange Rate:</span>
                        <span className="font-semibold">1 USD = {usdPkrRate.toFixed(2)} PKR</span>
                      </div>
                      <div className="flex justify-between text-white/70 text-sm">
                        <span>Gross PKR Amount:</span>
                        <span>{grossPkrAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                      </div>
                      <div className="flex justify-between text-white/70 text-sm">
                        <span>Mint Fee (0.3%):</span>
                        <span>-{mintFee.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                      </div>
                      <div className="flex justify-between text-white/70 text-sm">
                        <span>Burn Fee (0.3%):</span>
                        <span>-{burnFee.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                      </div>
                      <div className="border-t border-white/20 pt-2 flex justify-between text-white/70 text-sm">
                        <span>Total Fees (0.6%):</span>
                        <span>-{totalFees.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                      </div>
                      <div className="border-t border-white/20 pt-2 flex justify-between">
                        <span className="font-semibold">Net Amount in Bank:</span>
                        <span className="font-bold text-primary">{netPkrAmount.toLocaleString('en-US', { maximumFractionDigits: 2 })} PKR</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={startNewExchange}
                    variant="outline"
                    className="w-full border-white/20 text-white hover:bg-white/10"
                  >
                    Start New Exchange
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </main>
      </WhitelistCheck>
      <PKRFooter />
    </div>
  );
};

export default PKRSCV2Dashboard;

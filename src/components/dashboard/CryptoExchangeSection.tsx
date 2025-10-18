import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowDownUp, Loader2, ExternalLink } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAccount } from "wagmi";

interface Currency {
  name: string;
  ticker: string;
  fullName: string;
  image: string;
}

interface ExchangeRate {
  amount: string;
  rate: string;
}

export function CryptoExchangeSection() {
  const { address } = useAccount();
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromCurrency, setFromCurrency] = useState<string>("");
  const [toCurrency, setToCurrency] = useState<string>("usdt");
  const [amount, setAmount] = useState<string>("");
  const [estimatedAmount, setEstimatedAmount] = useState<string>("");
  const [receivingAddress, setReceivingAddress] = useState<string>("");
  const [transaction, setTransaction] = useState<any>(null);
  const [minAmount, setMinAmount] = useState<string>("");

  useEffect(() => {
    loadCurrencies();
  }, []);

  useEffect(() => {
    if (address) {
      setReceivingAddress(address);
    }
  }, [address]);

  useEffect(() => {
    if (fromCurrency && toCurrency) {
      loadMinAmount();
    }
  }, [fromCurrency, toCurrency]);

  useEffect(() => {
    if (fromCurrency && toCurrency && amount && parseFloat(amount) > 0) {
      const debounce = setTimeout(() => {
        calculateExchangeAmount();
      }, 500);
      return () => clearTimeout(debounce);
    }
  }, [fromCurrency, toCurrency, amount]);

  const loadCurrencies = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('changehero-exchange', {
        body: { action: 'getCurrencies', params: {} }
      });

      if (error) throw error;
      
      if (data?.result) {
        setCurrencies(data.result);
      }
    } catch (error: any) {
      console.error("Error loading currencies:", error);
      toast.error("Failed to load currencies");
    }
  };

  const loadMinAmount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('changehero-exchange', {
        body: { 
          action: 'getMinAmount',
          params: { from: fromCurrency, to: toCurrency }
        }
      });

      if (error) throw error;
      
      if (data?.result) {
        setMinAmount(data.result);
      }
    } catch (error: any) {
      console.error("Error loading min amount:", error);
    }
  };

  const calculateExchangeAmount = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('changehero-exchange', {
        body: { 
          action: 'getExchangeAmount',
          params: { from: fromCurrency, to: toCurrency, amount }
        }
      });

      if (error) throw error;
      
      if (data?.result) {
        setEstimatedAmount(data.result);
      }
    } catch (error: any) {
      console.error("Error calculating exchange:", error);
    }
  };

  const createExchange = async () => {
    if (!receivingAddress) {
      toast.error("Please enter your USDT receiving address");
      return;
    }

    if (!amount || parseFloat(amount) < parseFloat(minAmount)) {
      toast.error(`Minimum amount is ${minAmount} ${fromCurrency.toUpperCase()}`);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('changehero-exchange', {
        body: { 
          action: 'createTransaction',
          params: {
            from: fromCurrency,
            to: toCurrency,
            address: receivingAddress,
            amount: amount,
          }
        }
      });

      if (error) throw error;
      
      if (data?.result) {
        setTransaction(data.result);
        toast.success("Exchange created! Send your crypto to the deposit address.");
      } else if (data?.error) {
        throw new Error(data.error.message || "Failed to create exchange");
      }
    } catch (error: any) {
      console.error("Error creating exchange:", error);
      toast.error(error.message || "Failed to create exchange");
    } finally {
      setLoading(false);
    }
  };

  const popularCryptos = ['btc', 'eth', 'bnb', 'sol', 'matic', 'ltc', 'xrp'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Convert Crypto to USDT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!transaction ? (
            <>
              <div className="space-y-2">
                <Label>From Currency</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {popularCryptos.map(ticker => (
                      <SelectItem key={ticker} value={ticker}>
                        {ticker.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder={minAmount ? `Min: ${minAmount}` : "Enter amount"}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>

              <div className="flex justify-center">
                <ArrowDownUp className="h-6 w-6 text-primary" />
              </div>

              <div className="space-y-2">
                <Label>To Currency</Label>
                <Input value="USDT" disabled className="bg-muted" />
              </div>

              {estimatedAmount && (
                <Alert>
                  <AlertDescription>
                    You will receive approximately <strong>{estimatedAmount} USDT</strong>
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Your USDT Receiving Address</Label>
                <Input
                  placeholder="Connect wallet to see address"
                  value={receivingAddress}
                  disabled
                  className="bg-muted"
                />
              </div>

              <Button 
                onClick={createExchange} 
                disabled={loading || !fromCurrency || !amount || !receivingAddress}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Exchange
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Exchange Created!</strong>
                  <br />
                  Transaction ID: {transaction.id}
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p className="text-sm font-medium">Send your {fromCurrency.toUpperCase()} to:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-background rounded text-xs break-all">
                    {transaction.payinAddress}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(transaction.payinAddress);
                      toast.success("Address copied!");
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Amount to send: {transaction.amountExpectedFrom} {fromCurrency.toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  You will receive: ~{transaction.amountExpectedTo} USDT
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setTransaction(null);
                  setAmount("");
                  setEstimatedAmount("");
                }}
              >
                Create New Exchange
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

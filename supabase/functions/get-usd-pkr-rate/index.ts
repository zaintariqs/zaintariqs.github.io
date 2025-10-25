import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching USD/PKR exchange rate from xe.com...');
    
    const response = await fetch('https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=PKR', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract the exchange rate from xe.com - looking for the conversion result
    // Pattern: data-testid="result__TargetAmount" or class containing the rate value
    const rateMatch = html.match(/(\d+\.\d+)\s*Pakistani\s*Rupees?/i) || 
                      html.match(/1\s*USD\s*=\s*(\d+\.\d+)\s*PKR/i) ||
                      html.match(/"to"[^}]*"amount":"(\d+\.\d+)"/);
    
    const pkrRate = rateMatch ? parseFloat(rateMatch[1]) : null;
    
    if (!pkrRate) {
      throw new Error('PKR rate not found in response');
    }
    
    console.log('Current USD/PKR rate from xe.com:', pkrRate);
    
    return new Response(
      JSON.stringify({
        success: true,
        rate: pkrRate,
        timestamp: new Date().toISOString(),
        base: 'USD',
        source: 'xe.com'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

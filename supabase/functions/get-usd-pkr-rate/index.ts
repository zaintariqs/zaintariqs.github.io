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
    console.log('Fetching USD/PKR exchange rate from bestexchangeratetoday.com...');
    
    const response = await fetch('https://bestexchangeratetoday.com/usd-to-pkr');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch exchange rate: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Extract the main rate - looking for the pattern "US$ 1 =" followed by the rate
    const mainRateMatch = html.match(/US\$\s*1\s*=[\s\S]*?(\d+\.\d+)/);
    
    // Also extract different rate sources from the table
    const commercialBankMatch = html.match(/Commercial Bank Rate.*?(\d+\.\d+)/);
    const openMarketMatch = html.match(/Open-Market Rate.*?(\d+\.\d+)/);
    const officialMatch = html.match(/Official Central Bank Rate.*?(\d+\.\d+)/);
    
    const mainRate = mainRateMatch ? parseFloat(mainRateMatch[1]) : null;
    const commercialRate = commercialBankMatch ? parseFloat(commercialBankMatch[1]) : null;
    const openMarketRate = openMarketMatch ? parseFloat(openMarketMatch[1]) : null;
    const officialRate = officialMatch ? parseFloat(officialMatch[1]) : null;
    
    // Use commercial bank rate as primary, fallback to main rate
    const pkrRate = commercialRate || mainRate;
    
    if (!pkrRate) {
      throw new Error('PKR rate not found in response');
    }
    
    console.log('Current USD/PKR rates:', {
      primary: pkrRate,
      commercial: commercialRate,
      openMarket: openMarketRate,
      official: officialRate
    });
    
    return new Response(
      JSON.stringify({
        success: true,
        rate: pkrRate,
        rates: {
          commercial: commercialRate,
          openMarket: openMarketRate,
          official: officialRate,
          main: mainRate
        },
        timestamp: new Date().toISOString(),
        base: 'USD',
        source: 'bestexchangeratetoday.com'
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

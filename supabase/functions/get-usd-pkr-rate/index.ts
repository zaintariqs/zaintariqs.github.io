import { serve } from "https://deno.land/[email protected]/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Fetching USD/PKR exchange rate...');
    
    // Using exchangerate-api.com free tier (no key needed for basic usage)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    
    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.status}`);
    }
    
    const data = await response.json();
    const pkrRate = data.rates.PKR;
    
    if (!pkrRate) {
      throw new Error('PKR rate not found in response');
    }
    
    console.log('Current USD/PKR rate:', pkrRate);
    
    return new Response(
      JSON.stringify({
        success: true,
        rate: pkrRate,
        timestamp: data.time_last_updated,
        base: 'USD'
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

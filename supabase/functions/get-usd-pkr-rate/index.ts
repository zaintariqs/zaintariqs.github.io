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
    console.log('Fetching USD/PKR exchange rate from Google Finance...');

    let pkrRate: number | null = null;

    try {
      // Try Google Finance first
      const response = await fetch('https://www.google.com/finance/quote/USD-PKR', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`Google Finance responded with status ${response.status}`);
      }

      const html = await response.text();
      console.log('Fetched Google Finance page, parsing...');

      // Google Finance patterns
      const patterns = [
        /data-last-price="(\d+\.?\d*)"/,  // data-last-price attribute
        /data-mid="(\d+\.?\d*)"/,          // data-mid attribute
        /"price":"(\d+\.?\d*)"/,           // JSON price field
        /class="[^"]*YMlKec[^"]*">(\d+\.?\d*)</,  // Google Finance price class
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!Number.isNaN(parsed) && parsed > 0) {
            pkrRate = parsed;
            console.log('Found rate using pattern:', pattern.source);
            break;
          }
        }
      }

      if (pkrRate) {
        console.log('USD/PKR rate (Google Finance):', pkrRate);
        return new Response(
          JSON.stringify({ 
            success: true, 
            rate: pkrRate, 
            timestamp: new Date().toISOString(), 
            base: 'USD', 
            source: 'Google Finance' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      throw new Error('Could not parse rate from Google Finance');
    } catch (googleError) {
      console.warn('Google Finance failed, falling back to exchangerate.host:', (googleError as Error)?.message || googleError);

      // Fallback to exchangerate.host
      const fbRes = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=PKR');
      if (!fbRes.ok) {
        throw new Error(`Fallback provider error: ${fbRes.status}`);
      }
      const data = await fbRes.json();
      pkrRate = data?.rates?.PKR ?? null;

      if (!pkrRate) {
        throw new Error('PKR rate not found in fallback response');
      }

      console.log('USD/PKR rate (exchangerate.host):', pkrRate);
      return new Response(
        JSON.stringify({ 
          success: true, 
          rate: pkrRate, 
          timestamp: new Date().toISOString(), 
          base: 'USD', 
          source: 'exchangerate.host' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }
  
    
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

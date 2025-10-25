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

    let pkrRate: number | null = null;

    try {
      const response = await fetch('https://www.xe.com/currencyconverter/convert/?Amount=1&From=USD&To=PKR', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        throw new Error(`xe.com responded with status ${response.status}`);
      }

      const html = await response.text();

      const patterns = [
        /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[\s]*Pakistani\s*Rupees?/i, // e.g., "283.12 Pakistani Rupees"
        /1\s*USD\s*=\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)[\s]*PKR/i,   // e.g., "1 USD = 283.12 PKR"
        /"to"[^}]*"amount":"(\d{1,3}(?:,\d{3})*(?:\.\d+)?)"/,     // JSON blob in the page
      ];

      for (const p of patterns) {
        const m = html.match(p);
        if (m && m[1]) {
          const normalized = m[1].replace(/,/g, '');
          const parsed = parseFloat(normalized);
          if (!Number.isNaN(parsed)) {
            pkrRate = parsed;
            break;
          }
        }
      }

      if (pkrRate) {
        console.log('USD/PKR rate (xe.com):', pkrRate);
        return new Response(
          JSON.stringify({ success: true, rate: pkrRate, timestamp: new Date().toISOString(), base: 'USD', source: 'xe.com' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        );
      }

      throw new Error('Could not parse rate from xe.com HTML');
    } catch (xeError) {
      console.warn('xe.com fetch/parse failed, falling back to exchangerate.host:', (xeError as Error)?.message || xeError);

      // Fallback: exchangerate.host (free, reliable)
      const fbRes = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=PKR');
      if (!fbRes.ok) {
        throw new Error(`Fallback provider error: ${fbRes.status}`);
      }
      const data = await fbRes.json();
      pkrRate = data?.rates?.PKR ?? null;

      if (!pkrRate) {
        throw new Error('PKR rate not found in fallback response');
      }

      console.log('USD/PKR rate (fallback exchangerate.host):', pkrRate);
      return new Response(
        JSON.stringify({ success: true, rate: pkrRate, timestamp: new Date().toISOString(), base: 'USD', source: 'exchangerate.host' }),
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

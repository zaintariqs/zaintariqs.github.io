import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CHANGEHERO_API_URL = 'https://api.changehero.io/v2/';
const CHANGEHERO_API_KEY = Deno.env.get('CHANGEHERO_API_KEY');
const CHANGEHERO_API_SECRET = Deno.env.get('CHANGEHERO_API_SECRET');

async function signRequest(message: any): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(CHANGEHERO_API_SECRET);
  const messageData = encoder.encode(JSON.stringify(message));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function makeChangeHeroRequest(method: string, params: any) {
  const message = {
    jsonrpc: '2.0',
    id: crypto.randomUUID(),
    method,
    params,
  };

  const signature = await signRequest(message);

  const response = await fetch(CHANGEHERO_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': CHANGEHERO_API_KEY!,
      'sign': signature,
    },
    body: JSON.stringify(message),
  });

  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    console.log(`ChangeHero API call: ${action}`, params);

    let result;
    
    switch (action) {
      case 'getCurrencies':
        result = await makeChangeHeroRequest('getCurrencies', {});
        break;
        
      case 'getMinAmount':
        result = await makeChangeHeroRequest('getMinAmount', params);
        break;
        
      case 'getExchangeAmount':
        result = await makeChangeHeroRequest('getExchangeAmount', params);
        break;
        
      case 'getFixRate':
        result = await makeChangeHeroRequest('getFixRate', params);
        break;
        
      case 'createTransaction':
        result = await makeChangeHeroRequest('createTransaction', params);
        break;
        
      case 'createFixTransaction':
        result = await makeChangeHeroRequest('createFixTransaction', params);
        break;
        
      case 'getStatus':
        result = await makeChangeHeroRequest('getStatus', params);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`ChangeHero response for ${action}:`, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('ChangeHero API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
